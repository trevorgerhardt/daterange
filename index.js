
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
  var end, localeObject, range, start;

  //option defaults

  this.startDate = moment().startOf('day');
  this.endDate = moment().startOf('day');

  this.maxDate = moment().endOf('day');
  this.updateCompare = false;

  this.opens = 'right';

  this.buttonClasses = [ 'btn', 'btn-small' ];
  this.applyClass = 'btn-success';
  this.cancelClass = 'btn-default';

  this.format = 'MM/DD/YYYY';
  this.separator = ' - ';

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

  this.cb = function () { };

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

  localeObject = this.locale;

  if (hasOptions) {
    if (typeof options.locale == 'object') {
      $.each(localeObject, function (property, value) {
        localeObject[property] = options.locale[property] || value;
      });
    }

    if (options.applyClass) {
      this.applyClass = options.applyClass;
    }

    if (options.cancelClass) {
      this.cancelClass = options.cancelClass;
    }
  }

  this.parentEl = (hasOptions && options.parentEl && $(options.parentEl)) || $(this.parentEl);
  //the date range picker
  this.container = $(template).appendTo(this.parentEl);

  if (hasOptions) {

    if (typeof options.format == 'string') {
      this.format = options.format;
    }

    if (typeof options.separator == 'string') {
      this.separator = options.separator;
    }

    if (typeof options.startDate == 'string') {
      this.startDate = moment(options.startDate, this.format);
    }

    if (typeof options.endDate == 'string') {
      this.endDate = moment(options.endDate, this.format);
    }

    if (typeof options.maxDate == 'string') {
      this.maxDate = moment(options.maxDate, this.format);
    }

    if (typeof options.startDate == 'object') {
      this.startDate = moment(options.startDate);
    }

    if (typeof options.endDate == 'object') {
      this.endDate = moment(options.endDate);
    }

    if (typeof options.maxDate == 'object') {
      this.maxDate = moment(options.maxDate);
    }

    // update day names order to firstDay
    if (typeof options.locale == 'object') {
      if (typeof options.locale.firstDay == 'number') {
        this.locale.firstDay = options.locale.firstDay;
        var iterator = options.locale.firstDay;
        while (iterator > 0) {
          this.locale.daysOfWeek.push(this.locale.daysOfWeek.shift());
          iterator--;
        }
      }
    }

    if (typeof options.opens == 'string') {
      this.opens = options.opens;
    }

    if (typeof options.buttonClasses == 'string') {
      this.buttonClasses = [options.buttonClasses];
    }

    if (typeof options.buttonClasses == 'object') {
      this.buttonClasses = options.buttonClasses;
    }
  }

  this.startDate = this.startDate.startOf('day');
  this.endDate = this.endDate.startOf('day');

  //apply CSS classes to buttons
  var c = this.container;
  $.each(this.buttonClasses, function (idx, val) {
    c.find('button').addClass(val);
  });

  if (this.opens == 'right') {
    //swap calendar positions
    var left = this.container.find('.calendar.left');
    var right = this.container.find('.calendar.right');
    left.removeClass('left').addClass('right');
    right.removeClass('right').addClass('left');
  }

  if (typeof options == 'undefined' || typeof options.ranges == 'undefined') {
    this.container.find('.calendar').show();
    this.move();
  }

  if (typeof cb == 'function') {
    this.cb = cb;
  }

  this.container.addClass('opens' + this.opens);

  //try parse date if in text input
  if (!hasOptions || (typeof options.startDate == 'undefined' && typeof options.endDate == 'undefined')) {
    if ($(this.element).is('input[type=text]')) {
      var val = $(this.element).val();
      var split = val.split(this.separator);

      if (split.length == 2) {
        start = moment(split[0], this.format);
        end = moment(split[1], this.format);
      }

      if (start != null && end != null) {
        this.startDate = start;
        this.endDate = end;
      }
    }
  }

  //state
  this.oldStartDate = this.startDate.clone();
  this.oldEndDate = this.endDate.clone();

  this.leftCalendar = {
    month: moment([this.startDate.year(), this.startDate.month(), 1, this.startDate.hour(), this.startDate.minute()]),
    calendar: []
  };

  this.rightCalendar = {
    month: moment([this.endDate.year(), this.endDate.month(), 1, this.endDate.hour(), this.endDate.minute()]),
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

  //event listeners
  this.container.on('mousedown', $.proxy(this.mousedown, this));

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
  }, this));
  this.$endDate.on('click', $.proxy(function () {
    this.updateCompare = true;
  }, this));

  this.$checkbox.on('click', $.proxy(this.updateCompareSelect, this));
  this.$compareTo.on('change', $.proxy(this.updateCompareSelect, this));

  this.$compareStartDate.on('click', $.proxy(function () {
    this.updateCompare = true;
  }, this));
  this.$compareEndDate.on('click', $.proxy(function () {
    this.updateCompare = true;
  }, this));

  this.element.on('keyup', $.proxy(this.updateFromControl, this));

  this.updateView();
  this.updateCalendars();
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
  var isLeft = $(e.currentTarget).hasClass('left');

  if (this.updateCompare) {
    if (isLeft) {
      this.$compareStartDate.parent('.form-group').addClass('has-success');
    } else {
      this.$compareEndDate.parent('.form-group').addClass('has-success');
    }
  } else {
    if (isLeft) {
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
  var startTemp = moment(this.$startDate.val());
  var endTemp = moment(this.$endDate.val());
  var compareStartTemp = moment(this.$compareStartDate.val());
  var compareEndTemp = moment(this.$compareEndDate.val());

  if (startTemp && startTemp.isValid() && startTemp.isBefore(moment())) {
    this.startDate = startTemp;
    this.$startDate.parent('.form-group').removeClass('has-error');
  } else {
    this.$startDate.parent('.form-group').addClass('has-error');
  }

  if (endTemp && endTemp.isValid() && endTemp.isBefore(moment())) {
    this.endDate = endTemp;
    this.$endDate.parent('.form-group').removeClass('has-error');
  } else {
    this.$endDate.parent('.form-group').addClass('has-error');
  }

  if (compareStartTemp && compareStartTemp.isValid() && compareStartTemp.isBefore(moment())) {
    this.compareStartDate = compareStartTemp;
    this.$compareStartDate.parent('.form-group').removeClass('has-error');
  } else {
    this.$compareStartDate.parent('.form-group').addClass('has-error');
  }

  if (compareEndTemp && compareEndTemp.isValid() && compareEndTemp.isBefore(moment())) {
    this.compareEndDate = compareEndTemp;
    this.$compareEndDate.parent('.form-group').removeClass('has-error');
  } else {
    this.$compareEndDate.parent('.form-group').addClass('has-error');
  }

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
      this.updateCompare = this.$dateRange.val() !== 'custom';
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
 * Mousedown
 */

DateRangePicker.prototype.mousedown = function (e) {
  e.stopPropagation();
};

/**
 * Update view
 */

DateRangePicker.prototype.updateView = function () {
  this.leftCalendar.month.month(this.startDate.month()).year(this.startDate.year());
  this.rightCalendar.month.month(this.endDate.month()).year(this.endDate.year());

  this.$startDate.val(this.startDate.format(this.format));
  this.$endDate.val(this.endDate.format(this.format));

  if (this.startDate.isSame(this.endDate) || this.startDate.isBefore(this.endDate)) {
    this.$apply.removeAttr('disabled');
  } else {
    this.$apply.attr('disabled', 'disabled');
  }

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

  if (start == null || end == null) {
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

  if (!this.startDate.isSame(this.oldStartDate) || !this.endDate.isSame(this.oldEndDate)) {
    this.notify();
  }

  this.oldStartDate = this.startDate.clone();
  this.oldEndDate = this.endDate.clone();

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
  var cal = $(e.target).parents('.calendar');
  if (cal.hasClass('left')) {
    this.leftCalendar.month.subtract('month', 1);
  } else {
    this.rightCalendar.month.subtract('month', 1);
  }
  this.updateCalendars();
};

/**
 * Click next
 */

DateRangePicker.prototype.clickNext = function (e) {
  var cal = $(e.target).parents('.calendar');
  if (cal.hasClass('left')) {
    this.leftCalendar.month.add('month', 1);
  } else {
    this.rightCalendar.month.add('month', 1);
  }
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

  var endDate, startDate;

  var custom = this.$dateRange.val() === 'custom';
  var compareCustom = this.$checkbox.is(':checked') && this.$compareTo.val() === 'custom';
  var leftCalendar = cal.hasClass('left');

  if (!custom && !compareCustom) {
    this.$dateRange.val('custom');
    this.$startDate.attr('disabled', false);
    this.$endDate.attr('disabled', false);

    this.updateCompare = false;
  }

  if (leftCalendar) {
    startDate = this.leftCalendar.calendar[row][col];

    if (this.updateCompare) {
      endDate = this.compareEndDate;
    } else {
      endDate = this.endDate;
    }
  } else {
    if (this.updateCompare) {
      startDate = this.compareStartDate;
    } else {
      startDate = this.startDate;
    }

    endDate = this.rightCalendar.calendar[row][col];
  }

  cal.find('td').removeClass('active');

  if (startDate.isSame(endDate) || startDate.isBefore(endDate)) {
    $(e.target).addClass('active');

    if (this.updateCompare) {
      this.compareStartDate = startDate;
      this.compareEndDate = endDate;
    } else {
      this.startDate = startDate;
      this.endDate = endDate;
    }
  } else if (startDate.isAfter(endDate)) {
    $(e.target).addClass('active');

    if (this.updateCompare) {
      this.compareStartDate = startDate;
      this.$compareStartDate.val(startDate.format(this.format));
      this.compareEndDate = moment(startDate).add('day', 1).startOf('day');
      this.$compareEndDate.val(this.compareEndDate.format(this.format));
    } else {
      this.startDate = startDate;
      this.$startDate.val(startDate.format(this.format));
      this.endDate = moment(startDate).add('day', 1).startOf('day');
      this.$endDate.val(this.endDate.format(this.format));
    }
  }

  if (this.updateCompare) {
    this.leftCalendar.month.month(this.compareStartDate.month()).year(this.compareStartDate.year());
    this.rightCalendar.month.month(this.compareEndDate.month()).year(this.compareEndDate.year());
  } else {
    this.leftCalendar.month.month(this.startDate.month()).year(this.startDate.year());
    this.rightCalendar.month.month(this.endDate.month()).year(this.endDate.year());
  }

  if (custom && compareCustom && !leftCalendar) {
    this.updateCompare = !this.updateCompare;
  }

  if (custom && !compareCustom) {
    this.updateCompareSelect();
  }

  this.updateCalendars();
};

/**
 * Click apply
 */

DateRangePicker.prototype.clickApply = function (e) {
  this.updateInputText();
  this.hide();
};

/**
 * Click cancel
 */

DateRangePicker.prototype.clickCancel = function (e) {
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

  if (this.updateCompare) {
    this.container.find('.calendar.left').html(this.renderCalendar(this.leftCalendar.calendar, this.compareStartDate, null, this.maxDate));
    this.container.find('.calendar.right').html(this.renderCalendar(this.rightCalendar.calendar, this.compareEndDate, this.compareStartDate, this.maxDate));
  } else {
    this.container.find('.calendar.left').html(this.renderCalendar(this.leftCalendar.calendar, this.startDate, null, this.maxDate));
    this.container.find('.calendar.right').html(this.renderCalendar(this.rightCalendar.calendar, this.endDate, this.startDate, this.maxDate));
  }
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
    startDay = daysInLastMonth - 6;
  }

  var curDate = moment([lastYear, lastMonth, startDay, hour, minute]);
  for (i = 0, col = 0, row = 0; i < 42; i++, col++, curDate = moment(curDate).add('day', 1)) {
    if (i > 0 && col % 7 == 0) {
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

DateRangePicker.prototype.renderCalendar = function (calendar, selected, minDate, maxDate) {
  var html = '<div class="calendar-date">';
  var i;

  var start = parseInt(this.startDate.format('YYYYMMDD'), 10);
  var end = parseInt(this.endDate.format('YYYYMMDD'), 10);
  var compareStart = this.compareStartDate && parseInt(this.compareStartDate.format('YYYYMMDD'), 10);
  var compareEnd = this.compareEndDate && parseInt(this.compareEndDate.format('YYYYMMDD'), 10);

  html += '<table class="table-condensed">';
  html += '<thead>';
  html += '<tr>';

  if (!minDate || minDate.isBefore(calendar[1][1])) {
    html += '<th class="prev available"><i class="icon-chevron-left"></i></th>';
  } else {
    html += '<th></th>';
  }

  var dateHtml = this.locale.monthNames[calendar[1][1].month()] + calendar[1][1].format(" YYYY");

  html += '<th colspan="5" style="width: auto">' + dateHtml + '</th>';

  if (!maxDate || maxDate.isAfter(calendar[1][1])) {
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
