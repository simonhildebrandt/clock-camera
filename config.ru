require 'rack'
require 'grape'
require 'firebase'

require 'dotenv'
Dotenv.load


class S3Tools < Grape::API
  format :json
  prefix :app

  helpers do
    def host
      "#{ENV['S3_BUCKET']}.s3-#{ENV['AWS_REGION']}.amazonaws.com"
    end

    def valid_user?
      !!current_user
    end

    def current_user
      user_token, auth_details = decode_user_token
      require 'ostruct'
      OpenStruct.new(user_token)
    end

    def decode_user_token
      token = headers['User-Token']
      require 'jwt'
      header, payload, signature, signing_input = JWT::decoded_segments(token)
      kid, alg = header['kid'], header['alg']
      require 'open-uri'
      require 'json'
      certs = JSON.parse(open('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com').read)
      x509 = OpenSSL::X509::Certificate.new(certs[kid])
      JWT.decode(token, x509.public_key, true, { algorithm: alg, verify_iat: true })
    end
  end

  get :config do
    {
      s3: {
      endpoint: host,
      region: ENV['AWS_REGION'],
      access_key: ENV['AWS_ACCESS_KEY_ID'],
      bucket_name: ENV['S3_BUCKET'],
      max_file_size: ENV['MAX_FILE_SIZE'],
      },
      firebase: {
        api_key: ENV['FIREBASE_API_KEY'],
        database_url: ENV['FIREBASE_URL'],
        auth_domain: ENV['FIREBASE_AUTH_DOMAIN']
      }
    }
  end

  post 's3/success' do
    firebase = Firebase::Client.new("https://clock-camera-dev.firebaseio.com/", ENV['FIREBASE_SECRET'])
    attrs = {created_at: Time.now, creator: current_user.user_id, bucket: params[:bucket], key: params[:key]}
    response = firebase.push("images/#{current_user.user_id}", attrs)
  end

  post 's3/signature' do
    error!('invalid user') unless valid_user?
    aws_secret_key = ENV['AWS_SECRET_ACCESS_KEY']

    policy_data = { expiration: params[:expiration] }
    conditions = params[:conditions].inject({}) do |hash, clause|
      if clause.is_a? Array
        hash[clause[0]] = clause.slice(1..-1)
        hash
      else
        hash.merge clause
      end
    end
    settings = {
      #'success_action_status' => '201',
      'bucket' => ENV['S3_BUCKET'],
      'acl' => 'public-read',
      'content-length-range' => [0, ENV['MAX_FILE_SIZE']]
    }
    conditions.merge!(settings)
    policy_data['conditions'] = conditions.map do |key, value|
      if value.is_a? Array
        [key] + value
      else
        { key => value }
      end
    end
    policy_document = JSON.dump(policy_data)
    hashed_policy = Base64.encode64(policy_document).gsub("\n","")

    require 'base64'
    require 'openssl'
    require 'digest/sha1'
    signature = Base64.encode64(
      OpenSSL::HMAC.digest(
        OpenSSL::Digest.new('sha1'),
        aws_secret_key, hashed_policy
      )
    ).gsub("\n","")

    {
      policy: hashed_policy,
      signature: signature
    }

  end
end

use Rack::Static, urls: ['/media'], root: 'public', index: 'index.html'

run S3Tools
