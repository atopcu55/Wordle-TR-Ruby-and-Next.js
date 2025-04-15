require 'sinatra'
require "sinatra/namespace"
require 'sinatra/cross_origin'
require_relative 'wordle.rb'

configure do
  enable :cross_origin
end

before do
  response.headers['Access-Control-Allow-Origin'] = '*'
  response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
end

options "*" do
  response.headers["Access-Control-Allow-Origin"] = "*"
  response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
  response.headers["Access-Control-Allow-Headers"] = "Content-Type"
  200
end

namespace '/api' do
  before do
    content_type 'application/json'
  end

  helpers do
    def json_response(res)
      res.to_json
    end

    def json_params
      begin
        JSON.parse(request.body.read)
      rescue
        halt 400, { message:'Invalid JSON' }.to_json
      end
    end
  end

  def game(guess)
    return json_response({ message: "5 harfli bir kelime girin."}) unless $wordle.valid_guess(guess)
    result = $wordle.turkish(guess)
    return json_response({ message: result[1] }) unless result[0]

    res = {}
    res[:guess] = guess
    result = $wordle.check_guess(guess)
    res[:result] = result
    if guess == $wordle.word
      $wordle = nil
      res[:message] = "Tebrikler! Kelimeyi doğru tahmin ettiniz!"
    else
      $wordle.attempts -= 1
      res[:attempts] = $wordle.attempts
      if $wordle.game_over
        res[:message] = "Kaybettiniz! Doğru kelime: #{$wordle.word}"
      end
    end
    json_response(res)
  end

  post '/start' do
    $wordle=Wordle.new
    return json_response({ message: "Oyun başladı", attempts: $wordle.attempts })
  end

  post '/guess' do
    if $wordle.nil? || $wordle.game_over
      return json_response({ message: "Yeni oyun başlat." })
    end

    data = json_params
    guess = $wordle.turkish_upcase(data["guess"]).strip

    game(guess)
  end
end