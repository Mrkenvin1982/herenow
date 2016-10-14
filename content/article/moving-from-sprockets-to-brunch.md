+++
categories = ["Ruby On Rails", "Frontend"]
date = "2016-09-01T15:11:57-03:00"
description = "How to move your javascript from Rails' Sprockets pipeline to Brunch."
tags = ["development", "ruby on rails", "brunch", "frontend", "react"]
title = "Moving Assets from Sprockets to Brunch"
+++

## Considerations

First of all, this is not a complete migration to Brunch, we are only moving our javascript to Brunch, all other assets, such
as stylsheets, images and fonts may will remain in Rails' regular asset pipeline. I don't think there are any benefit of moving them
to Brunch.

We will also still need Sprockets to digest and build our assets manifest.


## Why Brunch

If you are reading this article, you are probably already interested in [brunch.io](http://brunch.io/). I first found Brunch in [Phoenix](http://www.phoenixframework.org/),
I immediately fell in love with it, it had such a simple configuration.

Our js code was already modulerized using [modulejs](https://larsjung.de/modulejs/), so it was easy to move it to Brunch's module system.

I'd probably have sticked with Sprockets and rails-assets (bower), but I really missed npm modules and the whole babel ecosystem. I'm also planning on getting HMR (Hot Module Replacement) going.

Brunch is awesome because it is simple, and that is the main reason I chose it. It is not nearly as well rounded as Webpack, nor is the community as good, but Webpack's complexity may not be worth it, especially for a team of full-stack developers like ours, that may struggle with Webpack. Brunch gets you 80% there, and it's good enough for me.


## Migrating from Sprockets to Brunch

You can migrate to Brunch in 4 easy steps:

* 1. [Install & Setup Brunch](#install-and-setup-brunch)
* 2. [Move assets over to Brunch](#move-assets-to-brunch)
* 3. [Prepare assets precompilation (for deployment)](#prepare-assets-precompilation)
* 4. [Getting React (react-rails) to work](#getting-react-rails-to-work)

<br/>

![It's easy gif](/images/gifs/thats-too-easy.gif)

<br/>


## <a name="install-and-setup-brunch"></a> 1. Install & Setup Brunch

#### Install brunch cli

```bash
$ npm install -g brunch
```

#### Create a package.json

Add the following `package.json` to your projects root folter.

***package.json***
```json
{
  "name": "my-app",
  "scripts": {
    "build": "brunch build",
    "build:production": "brunch build --production",
    "watch": "brunch watch --stdin"
  },
  "devDependencies": {
    "babel-brunch": "^6.0.5",
    "babel-plugin-add-module-exports": "^0.2.1",
    "babel-plugin-syntax-trailing-function-commas": "^6.8.0",
    "babel-preset-es2016": "^6.11.3",
    "babel-preset-react": "^6.11.1",
    "brunch": "~2.7.7",
    "javascript-brunch": "^2.0.0",
    "uglify-js-brunch": "^2.0.1"
  },
  "dependencies": {
    "jquery": "^3.1.0",
    "react": "^15.2.1",
    "react-dom": "^15.2.1"
  }
}
```

For organizational purposes, we will use `devDependencies` to define any dev/build related dependency we may need
to build our assets, and `dependencies` for libraries we will require in our code.

I'm still considering putting the `devDependencies` in `dependencies`, so we can shrinkwrap them, and guarrantee that
the bundle generated in production or any environment is always the same. Since a different babel preset version may be
installed, which may alter the final bundle.

Note that you only really need `brunch`, `babel-brunch`, `javascript-brunch` and `uglify-js-brunch` to get brunch
working. All the rest are optional dependencies.

#### Create a brunch-config.js

Add the following `brunch-config.js` to your projects root folder.

***brunch-config.js***
```js
exports.config = {
  conventions: {
    // Don't compile static assets folder into public folder.
    assets: (() => false),
  },

  paths: {
    watched: [
      "app/assets/brunch",
    ],

    // Compile brunch assets to rails assets folder
    // so Sprockets can still see them.
    //
    // Sprockets will still handle digesting the assets
    // and putting them on the public folder
    //
    // Note that we need to name the bundles (joinTo) with
    // the output path we want them to go, for example:
    // `javascripts/app.js` will compile to `app/assets/javascripts/app.js`
    public: "app/assets",
  },

  files: {
    javascripts: {
      // This bundle will be copied over to `app/assets/javascripts`
      // and then we fallback to rails regular asset pipeline.
      joinTo: {
        "javascripts/app-bundle.js": /^app\/assets\/brunch\/javascripts/,
        "javascripts/vendor-bundle.js": /^(node_modules)/,
      },
    },
  },

  // Configure your plugins
  plugins: {
    babel: {
      plugins: [
        'syntax-trailing-function-commas',
      ],
      presets: [
        'es2015',
        'es2016',
        'react',
      ],
    },
  },

  modules: {
    // Remove javascript assets path from module registration name, ex:
    // require("assets/brunch/javascripts/app.js") is now require("app.js")
    nameCleaner: (path) => {
      return path.replace(/^app\/assets\/brunch\/javascripts\//, '');
    },
    autoRequire: {
      "javascripts/app-bundle.js": [
        "app.js",
      ],
    }
  },

  npm: {
    enabled: true,
  },
};
```

#### Config assets for precompilation

Don't forget to add the new `app-bundle.js` and `vendor-bundle.js` for precompilation, add this to your `config/initializers/assets.rb`.

***config/initializers/assets.rb***
```ruby
config.assets.precompile += %w(
  app-bundle.js
  vendor-bundle.js
)
```

#### Link the bundles to your app

It's time to link our bundles to our app, you can require them on your already existing javascript bundle or include them in
your app's layout.

Add this to your `app/assets/javascripts/application.js`:

***app/assets/javascripts/application.js***
```js
//= require ./app-bundle
//= require ./vendor-bundle
```

***OR***

Add this to your `app/views/layouts/application.html.erb`:

***app/views/layouts/application.html.erb***
```ruby
<%= javascript_include_tag 'vendor-bundle' %>
<%= javascript_include_tag 'app-bundle' %>
```

#### Add to your .gitignore

***.gitignore***
```
# Npm debug files
npm-debug.log*

# Brunch compiled js bundles
/app/assets/javascripts/*-bundle.js
/app/assets/javascripts/*-bundle.js.map
```

#### Starting Brunch with Rails

Now we have to always remember to start `brunch watch` with our Rails server.

If you use foreman to start your app, add this to your `Procfile.dev` (if you use one to manage development app startup).

***Procfile.dev***
```
web: rails server
brunch: brunch watch
```

Then you may start your rails server with `foreman start -f Procfile.dev`.

If you don't use foreman, don't forget to start `brunch watch` with `rails server`.


## <a name="move-assets-to-brunch"></a> 2. Move assets over to Brunch

Now, all your javascript will live in `app/assets/brunch/javascripts`, it starts at `app.js`.

You don't need to require everything you will need in the bundle, Brunch automatically bundles everything in the
`app/assets/brunch/javascripts` folder. You do need to require your dependencies though

Create your `app/assets/brunch/javascripts/app.js`, it will automatically be required by Brunch, since we configured an `autoRequire`.


## <a name="prepare-assets-precompilation"></a> 3. Prepare assets precompilation (for deployment)

#### Precompilng assets

We need to tap into rails `assets:precompile` task and add Brunch to it.

Add/create the following code in `lib/tasks/assets.rake`.

***lib/tasks/assets.rake***
```
namespace :assets do
  desc "Build brunch assets for production"
  task :brunch_build  do
    sh 'npm run build:production' do |ok, res|
      unless ok
        puts "Failed to build brunch assets (exit status = #{res.exitstatus})"
        exit
      end
    end
  end

  # We need to run `brunch build` before the assets:environment task.
  #
  # Or when sprockets runs the precompile task, it won't find our
  # brunch generated bundles.
  Rake::Task['assets:precompile']
    .clear_prerequisites
    .enhance([
      'assets:brunch_build',
      'assets:environment',
    ])
end
```

#### Deploying to Heroku

If you plan on deploying to Heroku, you will need a nodejs environment, add `heroku/nodejs` buidpack to your app.

***.buildpack***
```
heroku/nodejs
heroku/ruby
```


## <a name="getting-react-rails-to-work"></a> 4. Getting React (react-rails) to work

Getting react-rails to work with Brunch is tricky if you plan on doing server rendering. Brunch builds don't play well with
Node.js, because its `require` conflicts with node's local `require`, I opened an issue about it at #1465(https://github.com/brunch/brunch/issues/1465).

It's not hard to fix, and it should probably be fixed soon, but Brunch's ecosystem doesn't seem as friendly as Webpack's for folks doing React and isomorphic apps in general.

For now, here's how my react-rails setup looks like:

***First***, don't use Node.js as ExecJS's runtime, it will not work with our bundle because of the issue I described above. You can use either
***therubyracer*** or ***mini_racer*** (any runtime that uses v8 directly), I prefer ***mini_racer***, so add it to your `Gemfile`:

***Gemfile***
```
gem 'mini_racer'
```

***Second***, add a new `server.js` entry point to your `brunch-config.js`, this build will be responsible for exposing our React components to react-rails. Don't forget
to also add `react` babel preset. You should add the following to your already existing `brunch-config.js`.

***brunch-config.js***
```js
...

  files: {
    javascripts: {
      joinTo: {
        "javascripts/app-bundle.js": /^app\/assets\/brunch\/javascripts/,
        "javascripts/vendor-bundle.js": /^(node_modules)/,
      },
      entryPoints: {
        "app/assets/brunch/javascripts/server.js": "javascripts/server-bundle.js",
      }
    },
  },

  // Configure your plugins
  plugins: {
    babel: {
      presets: [
        'es2015',
        'es2016',
        'react',
      ],
    }
  },

  modules: {
    autoRequire: {
      "javascripts/app-bundle.js": [
        "app.js",
      ],
      "javascripts/server-bundle.js": [
        "server.js",
      ],
    }
  },
...
```

***Third***, create your `server.js`, and start registering your components, I've actually separated my components in a `components.js`, so
I can share them with my `app.js` since not all components are server rendered, some are handled by react_ujs.

***app/assets/brunch/javascripts/server.js***
```js
// This bundle is imported by the server for server rendering
// Import and expose each component here, it will expects react
// components to be available on the global context (window|global).

// Find the global context
var globals = (typeof window === 'undefined' ? global : window);

// Expose React dependencies globally
globals.React = require('react');
globals.ReactDOM = require('react-dom');
globals.ReactDOMServer = require('react-dom/server');

// Register react components
require('components');
```

***app/assets/brunch/javascripts/components.js***
```js
// List of react components we need to expose to
// the global context, for:
// A) Pre-rendering: react-rails will look for components in the global context.
// b) react_ujs: react_ujs also expects components on the global context.
//
// If the react component is not present in this file, it won't be available.

var globals = (typeof window === 'undefined' ? global : window);

// Components
globals.ComponentName = require('components/component-path');
```

***Forth***, at last, we need to make `react-rails` aware of our setup, since we are not following its conventions anymore. Find your
`config.react.server_renderer_options` & `config.watchable_files` config, mine was at `config/application.rb`. Edit them to the following:

***config/application.rb***
```ruby
config.react.server_renderer_options = {
  files: ["server-bundle.js"], # files to load for prerendering
  replay_console: true,        # if true, console.* will be replayed client-side
}

# Reload our server rendering engine/server whenever our bundle changes
# This is very important, since, by default, react-rails only watches for
# changes in `.jsx` files inside `app/assets/javascripts`, and our js assets
# are in a different folder now.
config.watchable_files.concat Dir["#{config.root}/app/assets/javascripts/server-bundle.js"]
```

## Miscellaneous

### CI Environment

You will need to build your assets before running your tests in your CI server, unless your are already precompiling your assets before running your
tests for some odd reason.

In CircleCI it was as easy as adding this to my `circle.yml`:

***circle.yml***
```
dependencies:
  post:
    - npm run build # Build brunch assets
```
