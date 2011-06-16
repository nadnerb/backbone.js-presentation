window.PresentationController = Backbone.Controller.extend({

  routes: {
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
    $(this.el).html('<span>TExt</span>');
  }

});