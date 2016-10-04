require 'rack'
require 'grape'
require 'aws-sdk'
require 'base64'


require 'dotenv'
Dotenv.load



Aws.config.update({
  region: ENV['AWS_REGION'],
  credentials: Aws::Credentials.new(ENV['AWS_ACCESS_KEY_ID'], ENV['AWS_SECRET_ACCESS_KEY']),
})

S3_BUCKET = Aws::S3::Resource.new.bucket(ENV['S3_BUCKET'])



class S3Tools < Grape::API
  format :json
  prefix :s3

  get :config do
    {
      endpoint: "#{ENV['S3_BUCKET']}.s3-#{ENV['AWS_REGION']}.amazonaws.com",
      region: ENV['AWS_REGION'],
      access_key: ENV['AWS_ACCESS_KEY_ID'],
      bucket_name: ENV['S3_BUCKET'],
      max_file_size: ENV['MAX_FILE_SIZE']
    }
  end

  post :success do
    puts params.to_hash.inspect
  end

  post :signature do
    aws_secret_key = ENV['AWS_SECRET_ACCESS_KEY']
    puts params.to_hash.inspect
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
    puts policy_data.inspect
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
