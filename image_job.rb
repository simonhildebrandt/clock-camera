require 'firebase'
require 'sucker_punch'
require 'mini_magick'
require 'dotenv'
Dotenv.load

require 'aws-sdk'
Aws.config.update({
  region: ENV['AWS_REGION'],
  credentials: Aws::Credentials.new(ENV['AWS_ACCESS_KEY_ID'], ENV['AWS_SECRET_ACCESS_KEY'])
})

class ImageJob
  include SuckerPunch::Job

  SIZES = %w[256 512 1024]

  def all
    firebase.get('/images').body.map{|user, images| images.map{|k, v| {user: user, fb_id: k, image: v} } }.flatten(1)
  end

  def queue_all
    all.map{ |event| queue(event) }
    queue = SuckerPunch::Queue.find_or_create('ImageJob')
    while queue.busy_workers > 0
      puts "Remaining jobs #{queue.enqueued_jobs}"
      sleep 1
    end
  end

  def queue_first
    queue all.first
  end

  def run_first
    perform all.first
  end

  def queue event
    self.class.perform_async(event)
  end

  def tmp_path
    '/tmp/output.png'
  end

  def perform(event)
    user, fb_id, image = event[:user], event[:fb_id], event[:image]
    puts image
    puts "Checking #{event.inspect}"
    image = s3_image(image['key'])
    raise ImageJob::Error, "Image #{fb_id} (#{image.key}) doesn't exist in S3" unless image.exists?

    paths = SIZES.map do |size|
      filename = image.key.gsub(/\.\w+/, '.png').gsub(/images\//, '')
      path = "images/variations/#{size}/#{filename}"
      target = s3_image(path)
      puts path
      upload_variation(image.public_url, target, size) unless target.exists?
    end

    variations = Hash[paths.compact]
    puts variations
    firebase.update("/images/#{user}/#{fb_id}/variations", variations)
  end

  def upload_variation(source, target, size)
    canvas = MiniMagick::Image.open(source)
    canvas.resize "#{size}x#{size}>"
    canvas.format 'png'
    canvas.write tmp_path
    target.upload_file(tmp_path, {acl: 'public-read'})

    [size, { dimensions: canvas.dimensions, path: target.key }]
  end

  def s3_image path
    Aws::S3::Object.new(ENV['S3_BUCKET'], path)
  end

  def firebase
    @firebase ||= Firebase::Client.new(ENV['FIREBASE_URL'], ENV['FIREBASE_SECRET'])
  end

  class Error < StandardError; end
end
