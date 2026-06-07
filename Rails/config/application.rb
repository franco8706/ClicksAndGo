require_relative "boot"
require "rails"
require "active_model/railtie"
require "active_record/railtie"
require "action_controller/railtie"

Bundler.require(*Rails.groups)

module ClicksAndGo
  class Application < Rails::Application
    config.load_defaults 7.1
    config.api_only = true
    config.eager_load = ENV['RAILS_ENV'] == 'production'
    config.logger = Logger.new(STDOUT)
    config.log_level = :info

    # 🛡️ Rate limiting activo en todos los entornos
    config.middleware.use Rack::Attack
  end
end
