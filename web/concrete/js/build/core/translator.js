/* jshint unused:vars, undef:true, browser:true, jquery:true */
(function() {
'use strict';

if(window.ccmTranslator) {
  return;
}

var MAX_TRANSLATIONS_FOR_FASTSEARCH = 500;

var i18n = {
  AskDiscardDirtyTranslation: 'The current item has changed.\nIf you proceed you will lose your changes.\n\nDo you want to proceed anyway?',
  Comments: 'Comments',
  Context: 'Context',
  ExamplePH: 'Example: %s',
  Filter: 'Filter',
  Original_String: 'Original String',
  Please_fill_in_all_plurals: 'Please fill-in all plural forms',
  Plural_Original_String: 'Plural Original String',
  References: 'References',
  Save_and_Continue: 'Save & Continue',
  Search_for_: 'Search for...',
  Search_in_contexts: 'Search in contexts',
  Search_in_originals: 'Search in originals',
  Search_in_translations: 'Search in translations',
  Show_approved: 'Show approved',
  Show_translated: 'Show translated',
  Show_unapproved: 'Show unapproved',
  Show_untranslated: 'Show untranslated',
  Singular_Original_String: 'Singular Original String',
  Toggle_Dropdown: 'Toggle Dropdown',
  TAB: '[TAB] Forward',
  TAB_SHIFT: '[SHIFT]+[TAB] Backward',
  Translate: 'Translate',
  Translation: 'Translation',
  PluralNames: {
    zero: 'Zero',
    one: 'One',
    two: 'Two',
    few: 'Few',
    many: 'Many',
    other: 'Other'
  }
};

var translatorsCount = 0;

function Translation(data, translator) {
  $.extend(this, data);
  this.hasContext = 'context' in data;
  this.isPlural = 'originalPlural' in data;
  this.isTranslated = 'translations' in data;
  this.translator = translator;
  this.translator.translations.push(this);
}
Translation.prototype = {
  buildListItem: function() {
    var my = this;
    this.li = document.createElement('li');
    this.li.ccmTranslation = this;
    this.li.className = 'list-group-item clearfix' + (this.isTranslated ? ' list-group-item-success' : '');
    var sub = document.createElement('span');
    sub.textContent = sub.textText = this.original;
    this.li.appendChild(sub);
    this.liTranslated = document.createElement('span');
    this.translationUpdated(true);
    this.li.appendChild(this.liTranslated);
    this.translator.$list[0].appendChild(this.li);
    this.li.onclick = function() {
      my.translator.setCurrentTranslation(my);
    };
  },
  translationUpdated: function(skipSetClass) {
    this.liTranslated.textContent = this.liTranslated.textText = (this.isTranslated ? this.translations[0] : '');
    if(skipSetClass !== true) {
      if(this.isTranslated) {
        $(this.li).addClass('list-group-item-success');
      } else {
        $(this.li).removeClass('list-group-item-success');
      }
    }
  },
  translatedSaved: function(translations) {
    if(translations === null) {
      delete this.translations;
      this.isTranslated = false;
    } else {
      this.translations = translations;
      this.isTranslated = true;
    }
    this.translationUpdated();
  },
  applyFilter: function() {
    var shown = true;
    var f = this.translator.appliedFilter;
    if((f.showTranslated === false) && (this.isTranslated === true)) {
      shown = false;
    } else if((f.showUntranslated === false) && (this.isTranslated === false)) {
      shown = false;
    } else {
      if(f.text.length > 0) {
        var textFound = false;
        if((textFound === false) && f.searchInOriginals) {
          if(this.original.toLowerCase().indexOf(f.lowerCaseText) >= 0) {
            textFound = true;
          } else if(this.isPlural && (this.originalPlural.toLowerCase().indexOf(f.lowerCaseText) >= 0)) {
            textFound = true;
          }
        }
        if((textFound === false) && f.searchInTranslations && this.isTranslated) {
          for(var n = this.translations.length, i = 0; i < n && (textFound === false); i++) {
            if(this.translations[i].toLowerCase().indexOf(f.lowerCaseText) >= 0) {
              textFound = true;
            }
          }
        }
        if((textFound === false) && f.searchInContexts && this.hasContext) {
          if(this.context.toLowerCase().indexOf(f.lowerCaseText) >= 0) {
            textFound = true;
          }
        }
        if(textFound === false) {
          shown = false;
        }
      }
    }
    this.li.style.display = shown ? '' : 'none';
  }
};

var TranslationView = (function() {

  function Base(translation, multiline) {
    this.translation = translation;
    this.multiline = multiline;
    this.element = this.multiline ? 'textarea rows="8"' : 'input type="text"';
    this.$container = this.translation.translator.UI.$translation;
    this.$container.empty();
    this.$container.closest('.panel').css('visibility', 'visible');
    this.buildOriginalUI();
    this.buildTranslationUI();
    if(('comments' in this.translation) || ('context' in this.translation) || ('references' in this.translation)) {
      var $dl;
      this.$container.append($dl = $('<dl />'));
      if ('comments' in this.translation) {
        $dl
          .append($('<dt />').text(i18n.Comments))
          .append($('<dd />').text(this.translation.comments))
        ;
      }
      if ('context' in this.translation) {
        $dl
          .append($('<dt />').text(i18n.Context))
          .append($('<dd />').text(this.translation.context))
        ;
      }
      if ('references' in this.translation) {
        var $dd;
        $dl
          .append($('<dt />').text(i18n.References))
          .append($dd = $('<dd style="overflow: hidden; white-space: pre" />').text(this.translation.references.join('\n')))
        ;
        $dd.attr('title', $dd.text());
      }
    }
    var $li = $(this.translation.li);
    $li.addClass('list-group-item-info');
    var newScrollTop = null;
    var $ul = $li.closest('ul');
    var liTop = $li.position().top - $ul.position().top;
    var ulTop = $ul.scrollTop();
    if(liTop < 0) {
      newScrollTop = ulTop + liTop;
    }
    else {
      var liBottom = liTop + $li.outerHeight();
      var ulBottom = $ul.height();
      if(liBottom > ulBottom) {
        newScrollTop = ulTop + (liBottom - ulBottom);
      }
    }
    if(newScrollTop !== null) {
      $ul.animate({scrollTop: newScrollTop}, 50);
    }
  }
  Base.prototype = {
    isDirty: function() {
      var translated = this.getTranslated();
      if(translated === null) {
        return this.translation.isTranslated ? true : false;
      }
      if (this.translation.isTranslated === false) {
        return true;
      }
      var dirty = false;
      for(var n = translated.length, i = 0; i < n; i++) {
        if(translated[i] !== this.translation.translations[i]) {
          dirty = true;
          break;
        }
      }
      return dirty;
    },
    dispose: function() {
      $(this.translation.li).removeClass('list-group-item-info');
      this.$container.empty().closest('.panel').css('visibility', 'hidden');
    }
  };

  function Singular(translation) {
    Base.call(this, translation, (translation.original.indexOf("\n") >= 0) ? true : false);
  }
  $.extend(true, Singular.prototype, Base.prototype, {
    buildOriginalUI: function() {
      this.$container
        .append($('<div class="form-group" />')
          .append($('<label class="control-label" />').text(i18n.Original_String))
          .append($('<' + this.element + ' class="form-control" readonly="readonly" />').val(this.translation.original))
        )
      ;
    },
    buildTranslationUI: function() {
      this.$container
        .append($('<div class="form-group" />')
          .append($('<label class="control-label" />').text(i18n.Translation))
          .append(this.$translated = $('<' + this.element + ' class="form-control" />').val(this.translation.isTranslated ? this.translation.translations[0] : ''))
        )
      ;
      this.$translated.focus();
    },
    getTranslated: function(forSave) {
      var s = $.trim(this.$translated.val());
      return (s.length > 0) ? [s] : null;
    }
  });

  function Plural(translation) {
    Base.call(this, translation, ((translation.original.indexOf("\n") >= 0) || (translation.originalPlural.indexOf("\n") >= 0)) ? true : false);
  }
  $.extend(true, Plural.prototype, Base.prototype, {
    buildOriginalUI: function() {
      this.$container
        .append($('<div class="form-group" />')
          .append($('<label class="control-label" />').text(i18n.Singular_Original_String))
          .append($('<' + this.element + ' class="form-control" readonly="readonly" />').val(this.translation.original))
        )
        .append($('<div class="form-group" />')
          .append($('<label class="control-label" />').text(i18n.Plural_Original_String))
          .append($('<' + this.element + ' class="form-control" readonly="readonly" />').val(this.translation.originalPlural))
        )
      ;
    },
    showTranslationTab: function(key, focalize) {
      this.$tabHeaders.find('li.active').removeClass('active');
      this.$tabBodies.find('.tab-pane.active').removeClass('active');
      this.$tabHeaders.find('li[data-key="' + key + '"]').addClass('active');
      var $pane = this.$tabBodies.find('.tab-pane[data-key="' + key + '"]').addClass('active');
      if(focalize) {
        $pane.find('textarea,input').focus();
      }
    },
    buildTranslationUI: function() {
      var my = this;
      var uniquePrefix = 'ccm-translator' + this.translation.translator.index + '-translation';
      this.$container
        .append($('<div class="form-group" />')
          .append($('<label class="control-label" />').text(i18n.Translation))
          .append(this.$tabHeaders = $('<ul class="nav nav-tabs" />'))
          .append(this.$tabBodies = $('<div class="tab-content" />'))
        )
      ;
      var index = 0;
      this.$translated = {};
      var firstKey = null;
      $.each(this.translation.translator.plurals, function(key, examples) {
        if (firstKey === null) {
          firstKey = key;
        }
        my.$tabHeaders.append($('<li data-key="' + key + '"' + ((index === 0) ? ' class="active"' : '') + ' />')
          .append($('<a href="#' + uniquePrefix + '-' + key + '" />')
            .text(i18n.PluralNames[key])
          )
        );
        my.$tabBodies.append($('<div id="' + uniquePrefix + '-' + key + '" class="tab-pane' + ((index === 0) ? ' active' : '') + '"  data-key="' + key + '" style="padding: 20px" />')
          .append($('<p />').text(i18n.ExamplePH.replace(/%s/, examples)))
          .append(my.$translated[key] = $('<' + my.element + ' class="form-control" />').val(my.translation.isTranslated ? my.translation.translations[index] : ''))
        );
        index++;
      });
      this.$tabHeaders.find('a').on('click', function(e) {
        e.preventDefault();
        my.showTranslationTab($(this).closest('li').attr('data-key'));
      });
      this.$translated[firstKey].focus();
    },
    getTranslated: function(forSave) {
      var my = this;
      var result = [];
      var some = false, firstNotFilled = null;
      $.each(this.translation.translator.plurals, function(key) {
        var s = $.trim(my.$translated[key].val());
        if (s.length > 0) {
          some = true;
        } else if(firstNotFilled === null) {
          firstNotFilled = key;
        }
        result.push(s);
      });
      if (some === false) {
        return null;
      }
      if ((firstNotFilled !== null) && (forSave === true)) {
        this.showTranslationTab(firstNotFilled, true);
        window.alert(i18n.Please_fill_in_all_plurals);
        return false;
      }
      return result;
    }
  });

  return {Singular: Singular, Plural: Plural};
})();

function Translator(data) {
  this.index = translatorsCount++;
  this.containerID = data.container;
  this.height = data.height;
  this.saveAction = data.saveAction;
  this.plurals = $.extend(true, {}, data.plurals);
  this.translations = [];
  this.fuzzySupport = (data.fuzzySupport === false) ? false : null;
  for (var i = 0, n = data.translations.length; i < n; i++) {
    new Translation(data.translations[i], this);
  }
  this.saving = false;
}
Translator.prototype = {
  launch: function() {
    var my = this;
    this.UI = {};
    this.UI.$container = $(this.containerID);
    delete this.containerID;
    var height = this.height;
    delete this.height;
    if((!height) || (height < 200)) {
      height = 200;
    }
    this.UI.$container
      .append($('<div class="row" />')
        .append($('<div class="col-md-12" />')
          .append($('<div class="panel panel-info" />')
            .append($('<div class="panel-heading" />')
              .append($('<div class="panel-title" />').text(i18n.Filter))
            )
            .append($('<div class="panel-body" />')
              .append($('<div class="input-group">')
                .append(this.UI.$searchText = $('<input type="text" class="form-control" />')
                  .attr('placeholder', i18n.Search_for_)
                )
                .append($('<div class="input-group-btn" />')
                  .append(this.UI.$searchButton = $('<button type="button" class="btn btn-primary"><span class="fa fa-search"></span></button>'))
                  .append($('<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-expanded="false" />')
                    .append($('<span class="caret" />'))
                    .append($('<span class="sr-only" />').text(i18n.Toggle_Dropdown))
                  )
                  .append($('<ul class="dropdown-menu dropdown-menu-right" role="menu" />')
                    .append($('<li />')
                      .append(this.UI.$searchInOriginals = $('<a href="javascript:void(0)" />')
                        .text(' ' + i18n.Search_in_originals)
                        .prepend($('<i class="fa" />'))
                      )
                    )
                    .append($('<li />')
                      .append(this.UI.$searchInTranslations = $('<a href="javascript:void(0)" />')
                        .text(' ' + i18n.Search_in_translations)
                        .prepend($('<i class="fa" />'))
                      )
                    )
                    .append($('<li />')
                      .append(this.UI.$searchInContexts = $('<a href="javascript:void(0)" />')
                        .text(' ' + i18n.Search_in_contexts)
                        .prepend($('<i class="fa" />'))
                      )
                    )
                    .append('<li class="divider"></li>')
                    .append($('<li />')
                      .append(this.UI.$showUnapproved = $('<a href="javascript:void(0)" />')
                        .text(' ' + i18n.Show_unapproved)
                        .prepend($('<i class="fa" />'))
                      )
                    )
                    .append($('<li />')
                      .append(this.UI.$showApproved = $('<a href="javascript:void(0)" />')
                        .text(' ' + i18n.Show_approved)
                        .prepend($('<i class="fa" />'))
                      )
                    )
                    .append('<li class="divider"></li>')
                    .append($('<li />')
                      .append(this.UI.$showTranslated = $('<a href="javascript:void(0)" />')
                        .text(' ' + i18n.Show_translated)
                        .prepend($('<i class="fa" />'))
                      )
                    )
                    .append($('<li />')
                      .append(this.UI.$showUntranslated = $('<a href="javascript:void(0)" />')
                        .text(' ' + i18n.Show_untranslated)
                        .prepend($('<i class="fa" />'))
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
      .append($('<div class="row" />')
        .append($('<div class="col-md-7 ccm-translator-col-original" />')
          .append($('<div class="panel panel-primary" />')
            .append($('<div class="panel-heading clearfix" />')
              .append($('<span />').text(i18n.Original_String))
              .append($('<span />').text(i18n.Translation))
            )
            .append(this.$list = $('<ul class="list-group" />')
              .css('height', height + 'px')
            )
          )
        )
        .append($('<div class="col-md-5 ccm-translator-col-translations" />')
          .append($('<div class="panel panel-primary" />')
            .append($('<div class="panel-heading" />').text(i18n.Translate))
            .append(this.UI.$translation = $('<div class="panel-body" />'))
            .append($('<div class="panel-footer" />')
              .append($('<button class="btn btn-primary ccm-translator-savecontinue" />')
                .text(i18n.Save_and_Continue)
                .on('click', function() {
                  my.saveAndContinue();
                })
              )
              .append($('<small class="text-muted" style="margin-left: 20px" />').text(i18n.TAB))
              .append($('<small class="text-muted" style="margin-left: 20px" />').text(i18n.TAB_SHIFT))
            )
          )
        )
      )
    ;
    var n = this.translations.length;
    if(n < MAX_TRANSLATIONS_FOR_FASTSEARCH) {
      this.UI.$searchButton.remove();
      var hAutosearchTimer = null;
      this.UI.$searchText.on('change keydown keyup keypress', function() {
        if (hAutosearchTimer) {
          clearTimeout(hAutosearchTimer);
        }
        hAutosearchTimer = setTimeout(function() {
          hAutosearchTimer = null;
          my.filter();
        }, 100);
      });
    } else {
      this.UI.$searchText.on('keypress', function(e) {
        if ((e.keyCode || e.charCode) === 13) {
          my.filter();
        }
      });
      this.UI.$searchButton.on('click', function() {
        my.filter();
      });
    }
    var someContexts = false;
    for(var i = 0; i < n; i++) {
      this.translations[i].buildListItem();
      if (this.translations[i].hasContext) {
        someContexts = true;
      }
    }
    this.appliedFilter = {
      text: '',
      searchInOriginals: true,
      searchInTranslations: true,
      searchInContexts: false,
      showUnapproved: true,
      showApproved: true,
      showTranslated: true,
      showUntranslated: true
    };
    this.viewAppliedFilter();
    this.UI.$searchInOriginals.on('click', function() {
      my.filter({searchInOriginals: !my.appliedFilter.searchInOriginals});
    });
    this.UI.$searchInTranslations.on('click', function() {
      my.filter({searchInTranslations: !my.appliedFilter.searchInTranslations});
    });
    this.UI.$showTranslated.on('click', function() {
      my.filter({showTranslated: !my.appliedFilter.showTranslated});
    });
    this.UI.$showUntranslated.on('click', function() {
      my.filter({showUntranslated: !my.appliedFilter.showUntranslated});
    });
    if(this.fuzzySupport) {
      this.UI.$showUnapproved.on('click', function() {
        my.filter({showUnapproved: !my.appliedFilter.showUnapproved});
      });
      this.UI.$showApproved.on('click', function() {
        my.filter({showApproved: !my.appliedFilter.showApproved});
      });
    } else {
      this.UI.$showUnapproved.closest('li').prev().remove();
      this.UI.$showUnapproved.remove();
      this.UI.$showApproved.remove();
    }
    if(someContexts) {
      this.UI.$searchInContexts.on('click', function() {
        my.filter({searchInContexts: !my.appliedFilter.searchInContexts});
      });
    } else {
      this.UI.$searchInContexts.remove();
    }
    $(window).on('beforeunload', function() {
      if(my.currentTranslationView && my.currentTranslationView.isDirty()) {
        return i18n.AskDiscardDirtyTranslation;
      }
    });
    if(n > 0) {
      this.setCurrentTranslation(this.translations[0]);
    }
    this.UI.$container.on('keydown', function(e) {
      switch (e.keyCode || e.which) {
        case 9:
          e.preventDefault();
          my.saveAndContinue(e.shiftKey ? true : false);
          break;
      }
    });
  },
  viewAppliedFilter: function() {
    var f = this.appliedFilter;
    if(this.UI.$searchText.text() !== f.text) {
      this.UI.$searchText.text(f.text); 
    }
    this.UI.$searchInOriginals.find('i').removeClass('fa-check-square-o fa-square-o').addClass(f.searchInOriginals ? 'fa-check-square-o' : 'fa-square-o');
    this.UI.$searchInTranslations.find('i').removeClass('fa-check-square-o fa-square-o').addClass(f.searchInTranslations ? 'fa-check-square-o' : 'fa-square-o');
    this.UI.$searchInContexts.find('i').removeClass('fa-check-square-o fa-square-o').addClass(f.searchInContexts ? 'fa-check-square-o' : 'fa-square-o');
    this.UI.$showUnapproved.find('i').removeClass('fa-check-square-o fa-square-o').addClass(f.showUnapproved ? 'fa-check-square-o' : 'fa-square-o');
    this.UI.$showApproved.find('i').removeClass('fa-check-square-o fa-square-o').addClass(f.showApproved ? 'fa-check-square-o' : 'fa-square-o');
    this.UI.$showTranslated.find('i').removeClass('fa-check-square-o fa-square-o').addClass(f.showTranslated ? 'fa-check-square-o' : 'fa-square-o');
    this.UI.$showUntranslated.find('i').removeClass('fa-check-square-o fa-square-o').addClass(f.showUntranslated ? 'fa-check-square-o' : 'fa-square-o');
  },
  filter: function(f) {
    var my = this;
    var newFilter = $.extend(true, {}, this.appliedFilter, f, {text: this.UI.$searchText.val()});
    var needApplyFilter = false;
    $.each(newFilter, function(key, value) {
      if(value === my.appliedFilter[key]) {
        return;
      }
      switch(key) {
        case 'searchInOriginals':
        case 'searchInTranslations':
        case 'searchInContexts':
          if(my.appliedFilter.text === '') {
            return;
          }
          break;
      }
      needApplyFilter = true;
      return false;
    });
    this.appliedFilter = newFilter;
    this.viewAppliedFilter();
    if(!needApplyFilter) {
      return;
    }
    this.appliedFilter.lowerCaseText = this.appliedFilter.text.toLowerCase();
    var n = this.translations.length;
    for(var i = 0; i < n; i++) {
      this.translations[i].applyFilter();
    }
  },
  setCurrentTranslation: function(translation) {
    if (this.saving) {
      return false;
    }
    if(this.currentTranslationView) {
      if(this.currentTranslationView.translation === translation) {
        return;
      }
      if(this.currentTranslationView.isDirty()) {
        if(!window.confirm(i18n.AskDiscardDirtyTranslation)) {
          return;
        }
      }
      this.currentTranslationView.dispose();
      this.currentTranslationView = null;
    }
    if(translation === null) {
      return;
    }
    this.currentTranslationView = translation.isPlural ? new TranslationView.Plural(translation) :  new TranslationView.Singular(translation);
  },
  setSaving: function(saving) {
    this.saving = !!saving;
    var $btn = this.UI.$container.find('button.ccm-translator-savecontinue');
    if(this.saving) {
      $btn.css('width', $btn.outerWidth() + 'px').html('<span class="fa fa-spinner fa-spin"></span>');
    } else {
      $btn.css('width', 'auto').text(i18n.Save_and_Continue);
    }
  },
  saveAndContinue: function(backward) {
    var my = this;
    if (this.saving) {
      return;
    }
    if(this.currentTranslationView.isDirty() === false) {
      this.gotoNextTranslation(backward);
      return;
    }
    var translated = this.currentTranslationView.getTranslated(true);
    if (translated === false) {
      return;
    }
    var translation = this.currentTranslationView.translation;
    var postData = {};
    postData.id = translation.id;
    if(translated === null) {
      postData.clear = 1;
    } else {
      postData.translated = translated;
    }
    this.setSaving(true);
    $.ajax({
      type: 'POST',
      url: this.saveAction,
      data: postData,
      dataType: 'json'
    })
    .always(function() {
      my.setSaving(false);
    })
    .fail(function (data) {
      if (data.responseJSON && data.responseJSON.errors) {
        window.alert(data.responseJSON.errors.join("\n"));
      } else {
        window.alert(data.responseText);
      }
    })
    .success(function(response) {
      if(response && response.error) {
        window.alert(response.errors.join("\n"));
        return;
      }
      translation.translatedSaved(translated);
      my.gotoNextTranslation(backward);
    });
  },
  gotoNextTranslation: function(backward) {
    var $lis = this.$list.children(':visible');
    if($lis.length === 0) {
      this.setCurrentTranslation(null);
      return;
    }
    var newIndex = 0;
    if (this.currentTranslationView) {
      var currentIndex = $.inArray(this.currentTranslationView.translation.li, $lis);
      if (backward) {
        if (currentIndex >= 0) {
          newIndex = currentIndex - 1;
          if (newIndex < 0) {
            newIndex = $lis.length - 1;
          }
        }
      } else {
        if ((currentIndex >= 0) && (currentIndex < $lis.length - 1)) {
          newIndex = currentIndex + 1;
        }
      }
    }
    this.setCurrentTranslation($lis[newIndex].ccmTranslation);
  }
};

var Startup = (function() {
  var domReady = false, readyTranslators = [];
  function launch() {
    while(readyTranslators.length > 0) {
      readyTranslators.splice(0, 1)[0].launch();
    }
  }
  return {
    setDomReady: function() {
      domReady = true;
      if(readyTranslators.length) {
        launch();
      }
    },
    setTranslatorReady: function(translator) {
      readyTranslators.push(translator);
      if(domReady) {
        launch();
      }
    }
  };
})();

window.ccmTranslator = {
  setI18NDictionart: function(i18nDictionary) {
    $.extend(true, i18n, i18nDictionary);
  },
  initialize: function(data) {
    Startup.setTranslatorReady(new Translator(data));
  }
};
  
$(document).ready(function() {
  Startup.setDomReady();
});

})();
