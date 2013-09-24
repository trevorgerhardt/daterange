
/**
 * Dependencies
 */

var moment = require('moment');
var template = require('./template.html');

/**
 * Expose `apply`
 */

module.exports = function apply(el, options, cb) {
  el.data('date-range', new DateRangePicker(el, options, cb));
};

/**
 * DateRangePicker
 */

function DateRangePicker(element, options, cb) {
  var hasOptions = typeof options == 'object';
  var end, format, localeObject, range, start;

  // option defaults

  this.cb = cb || function () { };
  this.format = format = options.format || 'MM/DD/YYYY';
  this.opens = options.opens || 'right';
  this.separator = options.separator || ' - ';
  this.updateCompare = false;
  this.updateStart = true;

  function validDate(s) {
    var d = moment(s, (typeof s === 'string' ? format : undefined));
    if (!d.isValid()) {
      d = moment();
    }

    return d.startOf('day');
  }

  this.startDate = validDate(options.startDate);
  this.endDate = validDate(options.endDate);
  this.compareStartDate = options.compareStartDate ? validDate(options.compareStartDate) : null;
  this.compareEndDate = options.compareEndDate ? validDate(options.compareEndDate) : null;
  this.maxDate = options.maxDate ? validDate(options.maxDate).endOf('day') : moment().endOf('day');

  //state
  this.oldStartDate = this.startDate.clone();
  this.oldEndDate = this.endDate.clone();
  this.oldCompareStartDate = this.compareStartDate ? this.compareStartDate.clone() : null;
  this.oldCompareEndDate = this.compareEndDate ? this.compareEndDate.clone() : null;

  this.locale = {
    applyLabel: 'Apply',
    cancelLabel: 'Cancel',
    fromLabel: 'From',
    toLabel: 'To',
    weekLabel: 'W',
    customRangeLabel: 'Custom Range',
    daysOfWeek: moment()._lang._weekdaysMin.slice(),
    monthNames: moment()._lang._monthsShort.slice(),
    firstDay: 0
  };

  // by default, the date-range element is placed at the bottom of HTML body
  this.parentEl = 'body';

  //element that triggered the date range picker
  this.element = $(element);

  if (this.element.hasClass('pull-right')) {
    this.opens = 'left';
  }

  if (this.element.is('input')) {
    this.element.on({
      click: $.proxy(this.show, this),
      focus: $.proxy(this.show, this)
    });
  } else {
    this.element.on('click', $.proxy(this.show, this));
  }

  this.parentEl = (hasOptions && options.parentEl && $(options.parentEl)) || $(this.parentEl);
  //the date range picker
  this.container = $(template).appendTo(this.parentEl);

  if (this.opens === 'right') {
    //swap calendar positions
    var left = this.container.find('.calendar.left');
    var right = this.container.find('.calendar.right');
    left.removeClass('left').addClass('right');
    right.removeClass('right').addClass('left');
  }

  this.container.find('.calendar').show();
  this.move();

  this.container.addClass('opens' + this.opens);

  this.rightCalendar = {
    month: moment([
      this.endDate.year(),
      this.endDate.month(),
      1
    ]),
    calendar: []
  };

  var tempDate = this.endDate.clone().subtract('months', 1);
  this.leftCalendar = {
    month: moment([
      tempDate.year(),
      tempDate.month(),
      1
    ]),
    calendar: []
  };

  // elements
  this.$calendar = this.container.find('.calendar');
  this.$ranges = this.container.find('.ranges');

  this.$dateRange = this.$ranges.find('[name="date-range"]');
  this.$startDate = this.$ranges.find('[name="date-range-start"]');
  this.$endDate = this.$ranges.find('[name="date-range-end"]');

  this.$checkbox = this.$ranges.find('[type="checkbox"]');
  this.$compareTo = this.$ranges.find('[name="compare-to"]');
  this.$compareStartDate = this.$ranges.find('[name="compare-to-start"]');
  this.$compareEndDate = this.$ranges.find('[name="compare-to-end"]');

  this.$apply = this.$ranges.find('.btn-success');
  this.$cancel = this.$ranges.find('.btn-default');

  if (this.compareStartDate && this.compareEndDate) {
    this.$checkbox.prop('checked', true);
    this.$compareTo.val('custom');
  }

  //event listeners
  this.container.on('mousedown', function (e) {
    e.stopPropagation();
  });

  this.$calendar.on('mouseover', $.proxy(this.showChangingDate, this));
  this.$calendar.on('mouseout', $.proxy(this.clearCurrentInput, this));

  this.$calendar.on('click', '.prev', $.proxy(this.clickPrev, this));
  this.$calendar.on('click', '.next', $.proxy(this.clickNext, this));
  this.$calendar.on('click', 'td.available', $.proxy(this.clickDate, this));

  this.$apply.on('click', $.proxy(this.clickApply, this));
  this.$cancel.on('click', $.proxy(this.clickCancel, this));

  this.$ranges.on('keyup', 'input[type="text"]', $.proxy(this.manualUpdate, this));

  this.$dateRange.on('change', $.proxy(this.updateDateRange, this));

  this.$startDate.on('click', $.proxy(function () {
    this.updateCompare = false;
    this.updateStart = true;
    this.updateCalendars();
  }, this));
  this.$endDate.on('click', $.proxy(function () {
    this.updateCompare = false;
    this.updateStart = false;
    this.updateCalendars();
  }, this));

  this.$checkbox.on('click', $.proxy(this.updateCompareSelect, this));
  this.$compareTo.on('change', $.proxy(this.updateCompareSelect, this));

  this.$compareStartDate.on('click', $.proxy(function () {
    this.updateCompare = true;
    this.updateStart = true;
    this.updateCalendars();
  }, this));
  this.$compareEndDate.on('click', $.proxy(function () {
    this.updateCompare = true;
    this.updateStart = false;
    this.updateCalendars();
  }, this));

  this.element.on('keyup', $.proxy(this.updateFromControl, this));

  this.updateDateRange();
}

/**
 * Clear current input
 */

DateRangePicker.prototype.clearCurrentInput = function (e) {
  this.$compareStartDate.parent('.form-group').removeClass('has-success');
  this.$compareEndDate.parent('.form-group').removeClass('has-success');
  this.$startDate.parent('.form-group').removeClass('has-success');
  this.$endDate.parent('.form-group').removeClass('has-success');
};

/**
 * Show changing date
 */

DateRangePicker.prototype.showChangingDate = function (e) {
  this.clearCurrentInput();

  if (this.updateCompare) {
    if (this.updateStart) {
      this.$compareStartDate.parent('.form-group').addClass('has-success');
    } else {
      this.$compareEndDate.parent('.form-group').addClass('has-success');
    }
  } else {
    if (this.updateStart) {
      this.$startDate.parent('.form-group').addClass('has-success');
    } else {
      this.$endDate.parent('.form-group').addClass('has-success');
    }
  }
};

/**
 * Manual update
 */

DateRangePicker.prototype.manualUpdate = function (e) {
  var self = this;
  var validate = function ($el) {
    var d = moment($el.val());
    if (d && d.isValid() && d.isBefore(self.maxDate)) {
      $el.parent('.form-group').removeClass('has-error');
      return d.startOf('day');
    } else {
      $el.parent('.form-group').addClass('has-error');
      return null;
    }
  };

  var startTemp = validate(this.$startDate);
  var endTemp = validate(this.$endDate);
  var compareStartTemp = validate(this.$compareStartDate);
  var compareEndTemp = validate(this.$compareEndDate);

  this.startDate = startTemp ? startTemp : this.startDate;
  this.endDate = endTemp ? endTemp : this.endDate;
  this.compareStartDate = compareStartTemp ? compareStartTemp : this.compareStartDate;
  this.compareEndDate = compareEndTemp ? compareEndDate : this.compareEndDate;

  this.updateCalendars();
};

/**
 * Update date range
 */

DateRangePicker.prototype.updateDateRange = function (e) {
  var range = this.$dateRange.val();

  this.$startDate.attr('disabled', range !== 'custom');
  this.$endDate.attr('disabled', range !== 'custom');

  switch (range) {
  case 'custom':
    this.updateCompare = false;
    this.updateStart = true;
    break;
  case 'today':
    this.endDate = moment().startOf('day');
    this.startDate = this.endDate.clone();
    break;
  case 'yesterday':
    this.endDate = moment().startOf('day').subtract('days', 1);
    this.startDate = this.endDate.clone();
    break;
  case 'week':
    this.endDate = moment().startOf('day');
    this.startDate = this.endDate.clone().subtract('days', 6);
    break;
  case 'month':
    this.endDate = moment().startOf('day');
    this.startDate = this.endDate.clone().subtract('months', 1);
    break;
  }

  this.updateCompareSelect();
};

/**
 * Update compare
 */

DateRangePicker.prototype.updateCompareSelect = function (e) {
  var checked = this.$checkbox.is(':checked');
  var compare = this.$compareTo.val();

  this.container.find('[name="compare-to"],[name="compare-to-start"],[name="compare-to-end"]').attr('disabled', 'disabled');

  if (checked) {
    this.$compareTo.attr('disabled', null);
    this.$compareStartDate.parent().parent('.row').css('display', 'block');
    this.updateCompare = false;

    switch (compare) {
    case 'custom':
      if (e || this.$dateRange.val() !== 'custom') {
        this.updateCompare = true;
        this.updateStart = true;
      }

      this.$compareStartDate.attr('disabled', null);
      this.$compareEndDate.attr('disabled', null);
      break;
    case 'period':
      this.compareEndDate = this.startDate.clone().subtract('days', 1);
      this.compareStartDate = this.compareEndDate.clone().subtract('days', moment.duration(this.endDate - this.startDate).asDays());
      break;
    case 'year':
      this.compareEndDate = this.endDate.clone().subtract('years', 1);
      this.compareStartDate = this.startDate.clone().subtract('years', 1);
      break;
    }
  } else {
    this.$compareStartDate.parent().parent('.row').css('display', 'none');

    this.compareStartDate = null;
    this.compareEndDate = null;
  }

  this.updateView();
  this.updateCalendars();
};

/**
 * Update view
 */

DateRangePicker.prototype.updateView = function () {
  this.$startDate.val(this.startDate.format(this.format));
  this.$endDate.val(this.endDate.format(this.format));

  if (this.compareStartDate && this.compareEndDate) {
    this.$compareStartDate.val(this.compareStartDate.format(this.format));
    this.$compareEndDate.val(this.compareEndDate.format(this.format));
  }
};

/**
 * Update from control
 */

DateRangePicker.prototype.updateFromControl = function () {
  if (!this.element.is('input')) {
    return;
  }

  if (!this.element.val().length) {
    return;
  }

  var dateString = this.element.val().split(this.separator);
  var start = moment(dateString[0], this.format);
  var end = moment(dateString[1], this.format);

  if (!start.isValid() || !end.isValid()) {
    return;
  }

  if (end.isBefore(start)) {
    return;
  }

  this.startDate = start;
  this.endDate = end;

  this.notify();
  this.updateCalendars();
};

/**
 * Notify
 */

DateRangePicker.prototype.notify = function () {
  this.updateView();

  this.cb(this.startDate, this.endDate, this.compareStartDate, this.compareEndDate);
};

/**
 * Move
 */

DateRangePicker.prototype.move = function () {
  var parentOffset = {
    top: this.parentEl.offset().top - (this.parentEl.is('body') ? 0 : this.parentEl.scrollTop()),
    left: this.parentEl.offset().left - (this.parentEl.is('body') ? 0 : this.parentEl.scrollLeft())
  };

  if (this.opens == 'left') {
    this.container.css({
      top: this.element.offset().top + this.element.outerHeight() - parentOffset.top,
      right: $(window).width() - this.element.offset().left - this.element.outerWidth() - parentOffset.left,
      left: 'auto'
    });
    if (this.container.offset().left < 0) {
      this.container.css({
        right: 'auto',
        left: 9
      });
    }
  } else {
    this.container.css({
      top: this.element.offset().top + this.element.outerHeight() - parentOffset.top,
      left: this.element.offset().left - parentOffset.left,
      right: 'auto'
    });
    if (this.container.offset().left + this.container.outerWidth() > $(window).width()) {
      this.container.css({
        left: 'auto',
        right: 0
      });
    }
  }
};

/**
 * Show
 */

DateRangePicker.prototype.show = function (e) {
  this.container.show();
  this.move();

  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }

  $(document).on('mousedown', $.proxy(this.hide, this));
  this.element.trigger('shown', {target: e.target, picker: this});
};

/**
 * Hide
 */

DateRangePicker.prototype.hide = function (e) {
  this.container.hide();

  $(document).off('mousedown', this.hide);
  this.element.trigger('hidden', {
    picker: this
  });
};

/**
 * Update input text
 */

DateRangePicker.prototype.updateInputText = function() {
  if (this.element.is('input')) {
    this.element.val(this.startDate.format(this.format) + this.separator + this.endDate.format(this.format));
  }
};

/**
 * Click prev
 */

DateRangePicker.prototype.clickPrev = function (e) {
  this.leftCalendar.month.subtract('month', 1);
  this.rightCalendar.month.subtract('month', 1);
  this.updateCalendars();
};

/**
 * Click next
 */

DateRangePicker.prototype.clickNext = function (e) {
  this.leftCalendar.month.add('month', 1);
  this.rightCalendar.month.add('month', 1);
  this.updateCalendars();
};

/**
 * Click date
 */

DateRangePicker.prototype.clickDate = function (e) {
  var title = $(e.target).attr('data-title');
  var row = title.substr(1, 1);
  var col = title.substr(3, 1);
  var cal = $(e.target).parents('.calendar');

  var calDate, endDate, startDate;

  var custom = this.$dateRange.val() === 'custom';
  var compareCustom = this.$checkbox.is(':checked') && this.$compareTo.val() === 'custom';
  var leftCalendar = cal.hasClass('left');
  var clickedDate = leftCalendar ? this.leftCalendar.calendar[row][col] : this.rightCalendar.calendar[row][col];

  if (!custom && !compareCustom) {
    this.$dateRange.val('custom');
    this.$startDate.attr('disabled', false);
    this.$endDate.attr('disabled', false);

    this.updateCompare = false;
    this.updateStart = true;
  }

  if (this.updateStart) {
    if (this.updateCompare) {
      this.compareStartDate = clickedDate.clone();
      if (this.compareStartDate.isAfter(this.compareEndDate)) {
        this.compareEndDate = this.compareStartDate.clone();
      }
    } else {
      this.startDate = clickedDate.clone();
      if (this.startDate.isAfter(this.endDate)) {
        this.endDate = this.startDate.clone();
      }
    }
  } else {
    if (this.updateCompare) {
      this.compareEndDate = clickedDate.clone();
      if (this.compareEndDate.isBefore(this.compareStartDate)) {
        this.compareStartDate = this.compareEndDate.clone();
      }
    } else {
      this.endDate = clickedDate.clone();
      if (this.endDate.isBefore(this.startDate)) {
        this.startDate = this.endDate.clone();
      }
    }
  }

  var calleftdate, calrightdate;

  if (leftCalendar) {
    calleftdate = clickedDate;
    calrightdate = clickedDate.clone().add('months', 1);
  } else {
    calrightdate = clickedDate;
    calleftdate = clickedDate.clone().subtract('months', 1);
  }

  this.leftCalendar.month.month(calleftdate.month()).year(calleftdate.year());
  this.rightCalendar.month.month(calrightdate.month()).year(calrightdate.year());

  if (custom && compareCustom && !this.updateStart) {
    this.updateCompare = !this.updateCompare;
  }

  this.updateStart = !this.updateStart;

  if (custom && !compareCustom) {
    this.updateCompareSelect();
  } else {
    this.updateView();
    this.updateCalendars();
  }

  this.showChangingDate();
};

/**
 * Click apply
 */

DateRangePicker.prototype.clickApply = function (e) {
  e.preventDefault();

  this.updateInputText();
  this.notify();
  this.hide();
};

/**
 * Click cancel
 */

DateRangePicker.prototype.clickCancel = function (e) {
  e.preventDefault();

  this.startDate = this.oldStartDate;
  this.endDate = this.oldEndDate;
  this.compareStartDate = this.oldCompareStartDate;
  this.compareEndDate = this.oldCompareEndDate;

  this.updateView();
  this.updateCalendars();

  this.hide();
};

/**
 * Update calendars
 */

DateRangePicker.prototype.updateCalendars = function () {
  this.leftCalendar.calendar = this.buildCalendar(this.leftCalendar.month.month(), this.leftCalendar.month.year(), this.leftCalendar.month.hour(), this.leftCalendar.month.minute(), 'left');
  this.rightCalendar.calendar = this.buildCalendar(this.rightCalendar.month.month(), this.rightCalendar.month.year(), this.rightCalendar.month.hour(), this.rightCalendar.month.minute(), 'right');

  var minDate, left, right;
  if (this.updateCompare) {
    minDate = this.updateStart ? null : this.compareStartDate;
    left = this.renderCalendar(this.leftCalendar.calendar, minDate, this.maxDate, true);
    right = this.renderCalendar(this.rightCalendar.calendar, minDate, this.maxDate);
  } else {
    minDate = this.updateStart ? null : this.startDate;
    left = this.renderCalendar(this.leftCalendar.calendar, minDate, this.maxDate, true);
    right = this.renderCalendar(this.rightCalendar.calendar, minDate, this.maxDate);
  }

  this.container.find('.calendar.left').html(left);
  this.container.find('.calendar.right').html(right);
};

/**
 * Build calendar
 */

DateRangePicker.prototype.buildCalendar = function (month, year, hour, minute, side) {
  var firstDay = moment([year, month, 1]);
  var lastMonth = moment(firstDay).subtract('month', 1).month();
  var lastYear = moment(firstDay).subtract('month', 1).year();

  var daysInLastMonth = moment([lastYear, lastMonth]).daysInMonth();

  var dayOfWeek = firstDay.day();

  //initialize a 6 rows x 7 columns array for the calendar
  var calendar = [], i;
  for (i = 0; i < 6; i++) {
    calendar[i] = [];
  }

  //populate the calendar with date objects
  var startDay = daysInLastMonth - dayOfWeek + this.locale.firstDay + 1;
  if (startDay > daysInLastMonth) {
    startDay -= 7;
  }

  if (dayOfWeek == this.locale.firstDay) {
    startDay = daysInLastMonth + 1;
  }

  var curDate = moment([lastYear, lastMonth, startDay, hour, minute]);
  for (i = 0, col = 0, row = 0; i < 42; i++, col++, curDate = moment(curDate).add('day', 1)) {
    if (i > 0 && col % 7 === 0) {
      col = 0;
      row++;
    }
    calendar[row][col] = curDate;
  }

  return calendar;
};

/**
 * Render calendar
 */

DateRangePicker.prototype.renderCalendar = function (calendar, minDate, maxDate, left) {
  var html = '<div class="calendar-date">';
  var i;

  var start = parseInt(this.startDate.format('YYYYMMDD'), 10);
  var end = parseInt(this.endDate.format('YYYYMMDD'), 10);
  var compareStart = this.compareStartDate && parseInt(this.compareStartDate.format('YYYYMMDD'), 10);
  var compareEnd = this.compareEndDate && parseInt(this.compareEndDate.format('YYYYMMDD'), 10);

  html += '<table class="table-condensed">';
  html += '<thead>';
  html += '<tr>';

  if (left) {
    html += '<th class="prev available"><i class="icon-chevron-left"></i></th>';
  } else {
    html += '<th></th>';
  }

  var dateHtml = this.locale.monthNames[calendar[1][1].month()] + calendar[1][1].format(" YYYY");

  html += '<th colspan="5" style="width: auto">' + dateHtml + '</th>';

  if (!left && maxDate.isAfter(calendar[1][1].clone().endOf('month'))) {
    html += '<th class="next available"><i class="icon-chevron-right"></i></th>';
  } else {
    html += '<th></th>';
  }

  html += '</tr>';
  html += '<tr>';

  $.each(this.locale.daysOfWeek, function (index, dayOfWeek) {
    html += '<th>' + dayOfWeek + '</th>';
  });

  html += '</tr>';
  html += '</thead>';
  html += '<tbody>';

  for (var row = 0; row < 6; row++) {
    html += '<tr>';

    for (var col = 0; col < 7; col++) {
      var cname = 'available';

      if (calendar[row][col].month() !== calendar[1][1].month()) {
        html += '<td></td>';
        continue;
      }

      cname += (calendar[row][col].month() == calendar[1][1].month()) ? '' : ' off';

      var current = parseInt(calendar[row][col].format('YYYYMMDD'), 10);

      if ((minDate && calendar[row][col].isBefore(minDate)) || (maxDate && calendar[row][col].isAfter(maxDate))) {
        cname = ' off disabled';
      } else {
        if (current >= start && current <= end) {
          cname += ' in-range';
        }

        if (compareStart && compareEnd && current >= compareStart && current <= compareEnd) {
          cname += ' compare-to-in-range';
        }
      }

      var title = 'r' + row + 'c' + col;
      html += '<td class="' + cname.replace(/\s+/g, ' ').replace(/^\s?(.*?)\s?$/, '$1') + '" data-title="' + title + '">' + calendar[row][col].date() + '</td>';
    }
    html += '</tr>';
  }

  html += '</tbody>';
  html += '</table>';
  html += '</div>';

  return html;
};
