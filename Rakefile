require 'openssl'
require 'base64'

desc "Encryption tools"
namespace :crypt do
  desc "En-crypt a file"
  task :en, [:password,:path] do |t, args|
    path = File.absolute_path(args[:path])
    file = File.basename(path)
    password = args[:password]
    puts "Encrypting #{path}"

    cipher = OpenSSL::Cipher::AES256.new :CBC
    cipher.encrypt

    iv = cipher.random_iv
    safe_iv = Base64.urlsafe_encode64(iv)
    cipher.key = Digest::SHA256.digest password

    data = File.read(path)
    encrypted = cipher.update(data) + cipher.final

    final_filename = "#{file}.#{safe_iv}.encrypted"
    File.open(final_filename, "wb") do |f|
      f.write(encrypted)
    end
    puts final_filename
  end

  desc "De-crypt a file"
  task :de, [:password,:path] do |t, args|
    path = File.absolute_path(args[:path])

    unless path =~ /^(.*)\.([A-Za-z0-9\=\-\_]{1,})\.encrypted$/
      fail "Specify a filename ending in '.[base64 characters].encrypted'"
    end

    file = File.basename($1)
    puts "Decrypting #{path}"

    safe_iv = $2
    iv = Base64.urlsafe_decode64(safe_iv)

    password = args[:password]

    cipher = OpenSSL::Cipher::AES256.new :CBC
    cipher.decrypt

    cipher.key = Digest::SHA256.digest password
    cipher.iv = iv

    data = File.read(path)

    decrypted = cipher.update(data) + cipher.final
    File.open(file, "wb").write(decrypted)
  end
end
