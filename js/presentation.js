window.PresentationController = Backbone.Controller.extend({

  routes: {
    "/": "start",
    "page/:pageIndex" : "page"
  },

  initialize: function () {
    
  },

  page: function (pageIndex) {
    pageIndex = parseInt(pageIndex, 10);
  }

});

window.NavigationView = Backbone.View.extend({

  el: '#navigation',

  render: function() {
    this.$("#back-button").button({ disabled: true });
    this.$("#next-button").button({ disabled: true });
    this.$("#progress-bar").progressbar();
  }

});

window.HeaderView = Backbone.View.extend({

  el: '#header',

  render: function() {
    
  }

});