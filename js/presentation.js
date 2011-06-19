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
    this.headerView.updatePage(page);
    this.navigationView.updatePage(page);
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

    this.navigationView.initPages(page - 1);
  }

});

window.NavigationView = Backbone.View.extend({

  el: '#navigation',

  events: {
    'click #back-button': 'back',
    'click #next-button': 'next'
  },

  render: function() {
    this.$("#back-button").button({ disabled: true });
    this.$("#next-button").button({ disabled: true });

    this.$("#progress-bar").progressbar();
  },

  updatePage: function (page) {
    this.page = page;
    if (page === 1) {
      this.$("#back-button").button("disable");
      this.$("#next-button").button("enable");
    } else if (page === this.pages) {
      this.$("#back-button").button("enable");
      this.$("#next-button").button("disable");
    } else {
      this.$("#back-button").button("enable");
      this.$("#next-button").button("enable");
    }

    this.updateProgress();
  },

  updateProgress: function () {
    var progress = 100 * (this.page - 1) / (this.pages - 1);
    this.$("#progress-bar").progressbar('value', progress);
  },

  initPages: function (pages) {
    this.pages = pages;
  },

  back: function () {
    var nextPage = this.page - 1;
    document.location.hash = 'page/' + nextPage;
  },

  next: function () {
    var nextPage = this.page + 1;
    document.location.hash = 'page/' + nextPage;
  }

});

window.HeaderView = Backbone.View.extend({

  el: '#header',

  render: function() {
    
  },

  updatePage: function (page) {
    
  }

});