window.PresentationController = Backbone.Controller.extend({

  routes: {
    "page/:pageIndex" : "page"
  },

  initialize: function () {
    _(this).bindAll("next", "back");
    this.headerView = new HeaderView();
    this.navigationView = new NavigationView();
    this.navigationView.bind('next', this.next);
    this.navigationView.bind('back', this.back);
    this.contentsView = new ContentsView();
    this.contentsView.bind('next', this.next);
    this.navigationView.render();
    this.loadPages();
  },

  start: function () {
    this.started = new Date();
    document.location.hash = 'page/1';
  },

  page: function (pageIndex) {
    this.page = parseInt(pageIndex, 10);
    this.headerView.updatePage(this.page);
    this.navigationView.updatePage(this.page);
    this.contentsView.updatePage(this.page);
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

    this.totalPages = page - 1;
    this.navigationView.initPages(this.totalPages);
  },

  back: function () {
    if (this.page > 1) {
      var nextPage = this.page - 1;
      document.location.hash = 'page/' + nextPage;
    }
  },

  next: function () {
    if (this.page < this.totalPages) {
      var nextPage = this.page + 1;
      document.location.hash = 'page/' + nextPage;
    }
  },

  timer: function() {
    if (this.started) {
      this.headerView.updateTime(this.started);
    }
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
    this.trigger('back');
  },

  next: function () {
    this.trigger('next');
  },

  keypress: function (event) {
    if (event.keyCode == $.ui.keyCode.LEFT && this.page > 1) {
     this.trigger('back');
    } else if (event.keyCode == $.ui.keyCode.RIGHT && this.page < this.pages) {
      this.trigger('next');
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
  },

  updateTime: function (startTime) {
    var diffTime = new Date().getTime() - startTime.getTime();
    this.$('#timer').text(this.formatDuration(diffTime));
  },

  formatDuration: function (diffTime) {
    var totalSeconds = Math.floor(diffTime / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var minStr = minutes.toString();
    if (minStr.length === 1) {
      minStr = '0' + minStr;
    }
    var seconds = Math.floor(totalSeconds % 60);
    var secStr = seconds.toString();
    if (secStr.length === 1) {
      secStr = '0' + secStr;
    }
    return minStr + ':' + secStr;
  }

});

window.ContentsView = Backbone.View.extend({

  el: '#main-content',

  initialize: function () {
    _(this).bindAll('render', 'updatePage', 'hideComplete', 'keypress');
    $(document).keypress(this.keypress);
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
      $(this.el).append('<div id="' + this.pageId().substring(1) + '" style="display: none;" class="content-panel ui-corner-all"></div>');
    }
    var html = haml.compileHaml('page-' + this.page).call(null, {});
    if (this.sequence) {
      html = haml.compileHaml('page-' + this.page + '-' + this.sequence).call(null, {});
    }
    this.$(this.pageId()).html(html);
  },

  updatePage: function (page) {
    this.lastPage = this.page;
    this.page = page;
    this.sequence = null;
    this.render();
    
    if (!this.lastPage) {
      this.$('#start-contents').hide('slide', { direction: 'left' }, 'fast', this.hideComplete);
    } else if (this.lastPage < page) {
      this.$(this.pageId(this.lastPage)).hide('slide', { direction: 'left' }, 'fast', this.hideComplete);
    } else {
      this.$(this.pageId(this.lastPage)).hide('slide', { direction: 'right' }, 'fast', this.hideComplete);
    }
  },

  hideComplete: function () {
    if (this.lastPage < this.page || !this.lastPage) {
      this.$(this.pageId()).show('slide', { direction: 'right' }, 'fast');
    } else {
      this.$(this.pageId()).show('slide', { direction: 'left' }, 'fast');
    }
  },

  keypress: function (event) {
    if (event.keyCode == $.ui.keyCode.DOWN) {
      if(this.hasMoreContents()) {
        if (!this.sequence) {
          this.sequence = 1;
        } else {
          this.sequence++;
        }
        this.render();
      } else {
        this.trigger('next');
      }
    }
  },

  hasMoreContents: function () {
    var nextSequence = 1;
    if (this.sequence) {
      nextSequence = this.sequence + 1;
    }
    return $('#page-' + this.page + '-' + nextSequence).length > 0;
  }

});