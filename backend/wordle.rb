require 'colorize'
require 'net/http'
require 'json'
require 'uri'
require 'cgi'
require 'unicode_utils'

class Wordle
  attr_reader :word
  attr_accessor :attempts

  def initialize
    @words = %w[TAŞIT MASAL ARMUT ZEBRA KOYUN YABAN KİTAP DENİZ KALEM BURUN ÇİÇEK TARLA SÜTUN] 
    @word = @words.sample 
    @attempts = 6 
  end

  def start
    puts "🌟 Wordle Oyununa Hoşgeldiniz! 🌟".colorize(:light_blue)
    puts "5 harfli kelimeyi tahmin edin! (#{@attempts} hakkınız var)".colorize(:yellow)
    
    while @attempts > 0
      print "\nTahmininiz: "
      guess = gets.chomp
      guess=turkish_upcase(guess).strip
      unless valid_guess(guess) 
        puts "5 harfli bir kelime giriniz." 
        next
      end
      result=turkish(guess)
      unless result[0]
        puts result[1]
        next
      end

      result=check_guess(guess)
      colorize(guess, result)
      break if guess == @word
      @attempts -= 1
      puts "#{@attempts} hakkınız kaldı.".colorize(:yellow)
    end

    if game_over
      puts "\n💀 Kaybettiniz! Doğru kelime: #{@word}".colorize(:red)
    else
      puts "\n🎉 Tebrikler! Kelimeyi doğru tahmin ettiniz!".colorize(:green)
    end
  end

  def valid_guess(guess)
    if (guess.length == 5)
    return true
    end
  end

  def turkish(guess)
    begin
      encoded_guess = CGI.escape(turkish_downcase(guess))
      url = URI("https://sozluk.gov.tr/gts?ara=#{encoded_guess}")
      response1 = Net::HTTP.get(url)
      data1 = JSON.parse(response1)
    
      if data1.is_a?(Array) && !data1.empty?
        return [true]
      else
        mes = "Böyle bir kelime yok."
        return [false, mes]
      end

    rescue => e  
    mes = "Hata oluştu: #{e.message}"
    return [false, mes]
    end
  end
  
  def check_guess(guess)
    chars = []
    guess.each_char.map.with_index do |char, index|
      if @word[index] == char
        chars << "g"
      elsif @word.include?(char)
        chars << "y"
      else
        chars << "r"
      end
    end
    result = chars
  end

  def colorize(guess, result)
    colors = { "g" => "\e[32m", "y" => "\e[33m", "r" => "\e[31m" }
    reset = "\e[0m"
    
    colored_guess = guess.chars.map.with_index do |char, index|
      "#{colors[result[index]]}#{char}#{reset}"
    end.join
    
    puts colored_guess
  end

  def game_over
    @attempts.zero?
  end

  def turkish_downcase(text)
    UnicodeUtils.downcase(text, :tr)
  end
  
  def turkish_upcase(text)
    UnicodeUtils.upcase(text, :tr)
  end
end
