window.PresentationController = Backbone.Controller.extend({

  routes: {
    "/": "start",
    "page/:pageIndex" : "page"
  },

  initialize: function () {
    this.headerView = new HeaderView();
    this.navigationView = new NavigationView();
    this.navigationView.render();
    this.loadPages();
  },

  page: function (pageIndex) {
    var page = parseInt(pageIndex, 10);
  },

  loadPages: function () {
    var page = 1;
    var lastPage = false;
    while (!lastPage) {
      $.ajax({
        url: "pages/page_" + page + ".haml",
        dataType: 'html',
        async: false,
        success: function(data, textStatus, jqXHR) {
          $('#page-content').append(data);
          page++;
        },
        error: function () {
          lastPage = true;
        }
      });
    }
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