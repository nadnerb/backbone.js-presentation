window.PresentationController = Backbone.Controller.extend({

  routes: {
    "/": "start",
    "page/:pageIndex" : "page"
  },

  initialize: function () {
    this.headerView = new HeaderView();
    this.navigationView = new NavigationView();
    this.contentsView = new ContentsView();
    this.navigationView.render();
    this.loadPages();
  },

  page: function (pageIndex) {
    var page = parseInt(pageIndex, 10);
    this.headerView.updatePage(page);
    this.navigationView.updatePage(page);
    this.contentsView.updatePage(page);
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

  initialize: function () {
    _(this).bindAll('render', 'keypress');
    $(document).keypress(this.keypress);
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
  },

  keypress: function (event) {
    if (event.keyCode == $.ui.keyCode.LEFT && this.page > 1) {
      this.back();
    } else if (event.keyCode == $.ui.keyCode.RIGHT && this.page < this.pages) {
      this.next();
    }
  }

});

window.HeaderView = Backbone.View.extend({

  el: '#header',

  render: function() {
    this.$('#title').text($('#page-' + this.page).attr('title'));
  },

  updatePage: function (page) {
    this.page = page;
    this.render();
  }

});

window.ContentsView = Backbone.View.extend({

  el: '#main-content',

  initialize: function () {
    _(this).bindAll('render', 'updatePage', 'hideComplete');
  },

  pageId: function (page) {
    if (page) {
      return '#page-' + page + '-content';
    } else {
      return '#page-' + this.page + '-content';
    }
  },

  render: function() {
    if (this.$(this.pageId()).length === 0) {
      $(this.el).append('<div id="' + this.pageId().substring(1) + '" style="display: none;"></div>');
    }
    var html = haml.compileHaml('page-' + this.page).call(null, {});
    this.$(this.pageId()).html(html);
  },

  updatePage: function (page) {
    this.lastPage = this.page;
    this.page = page;
    this.render();
    var self = this;
    if (!this.lastPage) {
      this.$('#start-contents').hide('slide', { direction: 'left' }, 'fast', this.hideComplete);
    } else if (this.lastPage < page) {
      this.$(this.pageId(this.lastPage)).hide('slide', { direction: 'left' }, 'fast', this.hideComplete);
    } else {
      this.$(this.pageId(this.lastPage)).hide('slide', { direction: 'right' }, 'fast', this.hideComplete);
    }
  },

  hideComplete: function () {
    if (this.lastPage < this.page) {
      this.$(this.pageId()).show('slide', { direction: 'right' }, 'fast');
    } else {
      this.$(this.pageId()).show('slide', { direction: 'left' }, 'fast');
    }
  }

});