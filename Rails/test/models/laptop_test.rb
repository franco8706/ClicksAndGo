require "test_helper"

class LaptopTest < ActiveSupport::TestCase
  # ── real_image_url: tercera capa de la política de imágenes reales ───────

  test "acepta una foto de CDN de retailer" do
    url = "https://m.media-amazon.com/images/I/71abc.jpg"
    assert_equal url, create_laptop(image_url: url).real_image_url
  end

  test "devuelve nil si no hay imagen" do
    assert_nil create_laptop(image_url: nil).real_image_url
  end

  test "rechaza cada host de banco de imagenes de stock" do
    # No se usa create_laptop porque el CHECK de Postgres ya los bloquea:
    # acá se prueba la guarda de Ruby de forma aislada, que es la que protege
    # el dato heredado si alguna fila entró antes de existir el CHECK.
    Laptop::STOCK_IMAGE_HOSTS.each do |host|
      laptop = Laptop.new(image_url: "https://#{host}/photo-1.jpg")
      assert_nil laptop.real_image_url, "#{host} no fue rechazado"
    end
  end

  test "rechaza subdominios de un banco de stock" do
    assert_nil Laptop.new(image_url: "https://cdn.images.unsplash.com/x.jpg").real_image_url
  end

  test "rechaza http (el navegador bloquea contenido mixto sobre TLS)" do
    assert_nil Laptop.new(image_url: "http://m.media-amazon.com/x.jpg").real_image_url
  end

  test "rechaza una URL malformada sin lanzar" do
    ["https://", "no-es-una-url", "   ", "javascript:alert(1)"].each do |valor|
      assert_nil Laptop.new(image_url: valor).real_image_url, "#{valor.inspect} no fue rechazado"
    end
  end

  test "la lista de hosts de stock no esta vacia" do
    # Una lista vacía desactivaría la guarda en silencio.
    assert_operator Laptop::STOCK_IMAGE_HOSTS.length, :>=, 4
    assert_includes Laptop::STOCK_IMAGE_HOSTS, "images.unsplash.com"
  end

  # ── Validaciones Zero-Trust ─────────────────────────────────────────────

  test "exige marca y modelo" do
    laptop = Laptop.new(retailer: create_retailer, sku_original: "S", slug: "s", url_afiliado: "https://x")
    assert_not laptop.valid?
    %i[marca modelo].each { |campo| assert laptop.errors[campo].any?, "falta validar #{campo}" }
  end

  test "documentado: country_code tiene DEFAULT 'AR' en el esquema" do
    # Hallazgo de esta suite: un `Laptop.new` sin país nace como argentino
    # (`country_code CHAR(2) NOT NULL DEFAULT 'AR'`). No es un riesgo en el
    # pipeline real —`PersistenceOrchestrator` siempre asigna el país y un nil
    # explícito falla la validación (ver el test de payload incompleto)— pero
    # queda fijado acá para que un cambio de default no pase inadvertido.
    assert_equal "AR", Laptop.new.country_code
  end

  test "un country_code en blanco falla la validacion de presencia" do
    laptop = create_laptop
    laptop.country_code = ""
    assert_not laptop.valid?
    assert laptop.errors[:country_code].any?
  end

  test "el country_code debe tener exactamente 2 caracteres" do
    laptop = create_laptop
    laptop.country_code = "USA"
    assert_not laptop.valid?
  end

  test "normaliza el country_code a mayusculas" do
    assert_equal "US", create_laptop(country_code: "us").country_code
  end

  test "el slug es unico" do
    primero = create_laptop
    duplicado = Laptop.new(
      retailer: create_retailer(slug: "otro"), sku_original: "S2", slug: primero.slug,
      marca: "M", modelo: "X", country_code: "US", url_afiliado: "https://x"
    )
    assert_not duplicado.valid?
  end

  test "el sku es unico por retailer, pero se repite entre retailers distintos" do
    r1 = create_retailer(slug: "r1")
    r2 = create_retailer(slug: "r2")
    create_laptop(retailer: r1, sku: "MISMO-SKU")

    # Mismo retailer + mismo sku → inválido.
    assert_raises(ActiveRecord::RecordInvalid) { create_laptop(retailer: r1, sku: "MISMO-SKU") }
    # Distinto retailer → válido (el mismo producto en dos tiendas).
    assert_nothing_raised { create_laptop(retailer: r2, sku: "MISMO-SKU") }
  end

  test "product_type se normaliza a minusculas y cae en laptop por defecto" do
    assert_equal "laptop", create_laptop(product_type: "LAPTOP").product_type
    assert_equal "laptop", create_laptop(product_type: nil).product_type
  end

  test "product_type invalido lo rechaza la FK de la taxonomia" do
    assert_raises(ActiveRecord::InvalidForeignKey) { create_laptop(product_type: "banana") }
  end

  test "el CHECK rechaza un deal_score fuera de 1-10" do
    assert_raises(ActiveRecord::StatementInvalid) { create_laptop(deal_score: 99) }
  end

  # ── Scopes que usa el serializer ────────────────────────────────────────

  test "por_pais filtra por country_code normalizado" do
    create_laptop(country_code: "US")
    create_laptop(country_code: "AR")
    assert_equal 1, Laptop.por_pais("us").count
  end

  test "ofertas_destacadas solo devuelve score alto" do
    create_laptop(deal_score: 9.0)
    create_laptop(deal_score: 5.0)
    assert_equal 1, Laptop.ofertas_destacadas.count
  end
end
