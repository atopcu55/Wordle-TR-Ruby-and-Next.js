FROM ruby:3.3.5

# Uygulama dizini oluştur
WORKDIR /app

# Gemfile ve Gemfile.lock'u kopyala
COPY Gemfile Gemfile.lock ./

# Bundler'ı kur ve bağımlılıkları yükle
RUN gem install bundler && bundle install

# Diğer dosyaları kopyala
COPY . .

# Uygulama başlatma komutu
CMD ["bundle", "exec", "rackup", "-p", "8080", "--host", "0.0.0.0"]
