max_threads_count = ENV.fetch("RAILS_MAX_THREADS") { 5 }
min_threads_count = ENV.fetch("RAILS_MIN_THREADS") { max_threads_count }
threads min_threads_count, max_threads_count

# En Cloud Run cada instancia recibe su propia CPU; WEB_CONCURRENCY=2 duplica el throughput
# sin duplicar el uso de memoria (preload_app! comparte el heap Ruby entre workers vía CoW).
workers ENV.fetch("WEB_CONCURRENCY") { 2 }

port ENV.fetch("PORT") { 3000 }, "0.0.0.0"
environment ENV.fetch("RAILS_ENV") { "production" }
pidfile ENV.fetch("PIDFILE") { "tmp/pids/server.pid" }
preload_app!
on_worker_boot do
  ActiveRecord::Base.establish_connection if defined?(ActiveRecord)
end
plugin :tmp_restart
