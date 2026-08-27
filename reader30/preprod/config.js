// config.js

const ENV = {
  preprod: {
    supabaseUrl: "https://okqpskyzteuhwochesbv.supabase.co",
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rcXBza3l6dGV1aHdvY2hlc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTI2MDEsImV4cCI6MjEwMDk2ODYwMX0.AHxjCrvXKpccziqOo17-FgOm7uJo7WiVuUxrrsG_eWE"
  },
  prod: {
    supabaseUrl: "https://zugowxfbpbpcbqhznaeb.supabase.co",
    supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1Z293eGZicGJwY2JxaHpuYWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4Njg0MjAsImV4cCI6MjEwMDQ0NDQyMH0.TUmghp2tmqWeXoK8x1P_wbC5ARMeMQ3Npw_AwN8dGb4"
  }
};

const CURRENT_ENV = 'preprod';
window.APP_CONFIG = ENV[CURRENT_ENV];