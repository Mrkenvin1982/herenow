+++
categories = ["Ruby on Rails"]
date = "2016-05-01T00:45:16-03:00"
description = "Authenticate with your Actioncable server without having to share cookies with the domain that the Actioncable server is at"
tags = ["development", "ruby on rails", "actioncable", "rails 5", "cloudflare"]
title = "Running Actioncable on Different Domain Without Sharing Cookies"
+++

## Prelude

Rails 5 ActionCable standard setup expects your app to set a `user_id` signed cookie when you
authenticate a user, and connect to the ActionCable server on the same domain, so the browser shares this cookie.

This works great in most cases, since ActionCable and the App (website) run on the same server.

But I run my website on Heroku behind [Cloudflare](https://www.cloudflare.com/), and it does not accept websocket connections on lower
tier plans. Since I use Cloudflare for the SSL, I couldn't just connect to the websocket server on a different subdomain with Cloudflare
disabled and share the cookies on a domain level, the browser would still expect a valid SSL connection on that endpoint. Sure, one could just
purchase and maintain a SSL for this especial websocket endpoint, but I find that maintaining a SSL endpoint it too much of a hassle. You might
not be allowed to just share the user_id cookie with the entire domain.

So I needed to figure another way to send the `user_id` to the ActionCable server.

## Solution

Connect to an CloudFlare disabled subdomain and share the signed user id via query parameters.

![cloudflare disabled subdomain image](/images/refs/disabled-cloudflare-subdomain.png)

Then render the signed `user_id` in the DOM, and send it over query parameters.

### First, expose the signed user id

Create a helper method so we can render the signed user_id in the view.

```ruby
class ApplicationController < ActionController::Base
  helper_method :signed_user_id

  private

  def signed_user_id
    @signed_user_id ||= crypt.encrypt_and_sign(current_user.id) if current_user
  end

  def crypt
    @crypt ||= ActiveSupport::MessageEncryptor.new(
      Rails.application.secrets.secret_key_base,
    )
  end
end
```

### Second, render it

Now, we need to render it somewhere, so we can later retrieve it via JS, I always like
to have a global `AppConfig` variable, that I use to pass setup data to my JS app.

```html
<script type="text/javascript">
  window.AppConfig = {
    WEBSOCKET_HOST: "<%= ENV['WEBSOCKET_HOST'] %>",
    WEBSOCKET_PATH: "<%= ActionCable.server.config.mount_path %>",
  <% if user_signed_in? %>
    WEBSOCKET_USER_ID_SECRET: "<%= signed_user_id %>",
  <% end %>
  }
</script>
```

Put this code somewhere in your `application.html.erb` layout file , before your javascript files.

When running the app, set the `WEBSOCKET_HOST` env to whatever domain you want to connect, for example `websocket.myapp.com:80`.

I'm not sure if we can trust `ActionCable.server.config.mount_path`, change it to whatever path your
ActionCable server is mounted to if it doesn't work.

### Third, connect to it

Now we can connect to our ActionCable server, here is how I do it.

```js
var protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
var host     = window.AppConfig.WEBSOCKET_HOST || window.location.host;
var path     = window.AppConfig.WEBSOCKET_PATH || '/cable';
var userId   = window.AppConfig.WEBSOCKET_USER_ID_SECRET;
var url      = protocol + host + path;

if(userId) {
  url += '?user_id=' + encodeURIComponent(userId);
}

App.cable = ActionCable.createConsumer(url);
```

### Lastly, authenticate it

Now, we need to update how our actioncable connection class authenticates users.

```ruby
module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    protected

    def find_verified_user
      if current_user = User.find_by(id: user_id)
        current_user
      else
        reject_unauthorized_connection
      end
    end

    private

    def user_id
      signed_user_id = request.params.fetch(:user_id)

      crypt.decrypt_and_verify(signed_user_id)
    end

    def crypt
      @crypt ||= ActiveSupport::MessageEncryptor.new(
        Rails.application.secrets.secret_key_base,
      )
    end
  end
end
```

## Caveats

Nothing is perfect, read below.

![funny gif](/images/gifs/welding-accident.gif)

### Rendering the signed user id in the DOM is no secure

The signed user_id is an unchanging secret, by rendering it on the html it has a greater
chance of being leaked/exposed, then when it was shared via cookies. A user might save the
webpage and share it, forever exposing the actioncable authentication secret, for example.

One might call this a feature though ¯\_(ツ)_/¯, now your realtime app still works when the webpage is saved.

The ideal solution is to move to a token based approach, so instead of encrypting the `user_id`, we would generate
a token, render it on the html, and use it to connect to the actioncable server. This token could then
have an expiration date and/or be invalidated when used.

Note that sharing the encrypted `user_id` via cookies does not make you safe either, it can still be leaked.

Rails will probably move to a token based authentication scheme in the future, ActionCable is still new.

---------

***UPDATE (May 5, 2016)***

Cloudflare has included websocket support on all plans, read more at:

https://support.cloudflare.com/hc/en-us/articles/200169466-Can-I-use-CloudFlare-with-WebSockets-

