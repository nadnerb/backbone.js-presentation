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
    this.$("#back-button").button();
    this.$("#next-button").button();
    this.$("#progress-bar").progressbar();

    this.$('#status').progressbar();
  }

});