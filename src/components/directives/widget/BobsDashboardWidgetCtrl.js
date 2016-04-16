/*
 * Copyright (c) 2014 DataTorrent, Inc. ALL Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*
 *   Controller:  'DashboardWidgetCtrl'
 *
 *   Called by: 'widget' directive in dashboard-directives js
 */
'use strict';

angular.module('ui.dashboard')
  .controller('BobsDashboardWidgetCtrl', ['$scope', '$element', '$compile', '$window', '$timeout', 'kendoRefreshFactory',
    function ($scope, $element, $compile, $window, $timeout, kendoRefreshFactory) {

      $scope.status = {
        isopen: false
      };

      // Fills "container" with compiled view
      $scope.makeTemplateString = function () {

        var widget = $scope.widget;

        // First, build template string
        var templateString = '';

        if (widget.templateUrl) {

          // Use ng-include for templateUrl
          templateString = '<div ng-include="\'' + widget.templateUrl + '\'"></div>';

        } else if (widget.template) {

          // Direct string template
          templateString = widget.template;

        } else {

          // Assume attribute directive
          templateString = '<div ' + widget.directive;

          // Check if data attribute was specified
          if (widget.dataAttrName) {
            widget.attrs = widget.attrs || {};
            widget.attrs[widget.dataAttrName] = 'widgetData';
          }

          // Check for specified attributes
          if (widget.attrs) {

            // First check directive name attr
            if (widget.attrs[widget.directive]) {
              templateString += '="' + widget.attrs[widget.directive] + '"';
            }

            // Add attributes
            _.each(widget.attrs, function (value, attr) {

              // make sure we aren't reusing directive attr
              if (attr !== widget.directive) {
                templateString += ' ' + attr + '="' + value + '"';
              }

            });
          }
          templateString += '></div>';
        }
        return templateString;
      };

      // added Kendo chart refresh option - 04/27/2015 BM:
      $scope.refreshGadget = function (e) {
        // restores down to fixed widget size

        var widget = $scope.widget;
        var widgetElm = $element.find('.widget');

        widget.maximized = false;   // because we're resizing down...

        // pick up fixed values from widget
        var newHeight = widget.fixedSize.height;
        var newWidth = widget.fixedSize.width;

        $scope.widget.setHeight(newHeight + 'px');
        widget.setWidth(newWidth);

        $scope.$emit('widgetChanged', $scope.widget);
        //$scope.$apply(); // make AngularJS to apply style changes     // throwing inprog exceptions - 10/21/2015 BM:

        $scope.$broadcast('widgetResized', {
          height: newHeight
        });

        // get current widget width
        var wid = widgetElm.width();

        // kendo chart - refresh height; kendo treelist - expand top node. - 03/30/2015 BM:
        var chart = widgetElm.find('.k-chart').data("kendoChart");
        var treelist = widgetElm.find('.k-treelist').data("kendoTreeList");
        var grid = widgetElm.find('.k-grid').data("kendoGrid");             // recompile - 10/01/2015 BM:

        if (grid != undefined) {
          // user may have switched from a treelist to a heatmap (ex/ .templateUrl = '...\grid.html')
          $scope.compileTemplate(grid);
          //grid.refresh();
        }
        if (chart != undefined) {
          chart.setOptions({ chartArea: { height: newHeight * .90, width: wid * .95 } });
          chart.resize($(".k-chart"));
        }

        if (treelist != undefined) {

          /* TEST !!!!!! */
          //var ds = treelist.dataSource.data(); $('[data-uid="' + ds[0].uid + '"] td');

          if (widget.chartType == 'heatmap') {
            // user may have swapped widgets for a heatmap, so we need to recompile the templateUrl property - 10/01/2015 BM:
            $scope.compileTemplate();
            //treelist.refresh();
          }
          else if (widget.chartType == 'treelist') {
            //$scope.compileTemplate(treelist);               // attempt refresh in below timer event - 10/01/2015 BM:
          }
        }
        // **** KENDO REFRESH TIMER ***
        kendoRefreshTimer();
      }
      // added maximize icon to widget header (dashboard.html template) - 4/2//2015 BM:
      $scope.maxResizer = function (e) {
        // TODO: properly restore the window to original position..

        var widget = $scope.widget;
        var widgetElm = $element.find('.widget');

        e.stopPropagation();        // testing - same as grabSouthResizer() below
        e.originalEvent.preventDefault();

        var pixelHeight = widgetElm.height();
        var pixelWidth = widgetElm.width();

        // fyi: '.k-tree' will auto-resize, so no need to find that
        var chart = widgetElm.find('.k-chart').data("kendoChart");
        var treelist = widgetElm.find('.k-treelist').data("kendoTreeList");
        var treemap = widgetElm.find('.k-treemap').data("kendoTreeMap");

        // height differential (reduce height of container if inner widget is a treelist)
        // (set to zero if you want the entire height of screen to be used)
        var ht_diff = 200;  //  (chart != undefined ? 200 : 500);   // keep treelist height same as others
        var newHeight = window.innerHeight - ht_diff;

        if (!widget.maximized) {
          // widget container maximize
          widget.maximized = true;

          widget.setWidth(window.innerWidth);
          widget.setHeight(newHeight);        //window.innerHeight - ht_diff);

          $scope.$emit('widgetChanged', widget);
          //$scope.$apply();  // throwing inprog exceptions - 10/21/2015 BM:

          $scope.$broadcast('widgetResized', {
            width: window.innerWidth,
            height: newHeight       //window.innerHeight - ht_diff
          });


          if (chart != undefined) {
            // refresh Kendo chart height/widget within the container, keeping it to 90% of ht/wt for better chart rendering - 03/30/2015 BM:
            chart.setOptions({ chartArea: { height: widgetElm.height() * .9, width: widgetElm.width() * .95 } });
            chart.resize($(".k-chart"));
          }
          if (treelist != undefined) {
            treelist.expand($("#treelist tbody>tr:eq(0)"));
            treelist.options.height = newHeight;       //(window.innerHeight - ht_diff) - 35;
            treelist.refresh();
          }
          if (treemap != undefined) {
            treemap.setOptions({ chartArea: { height: newHeight, width: widgetElm.width() * .95 } });
            treemap.resize($(".k-treemap"));
          }
        }
        else {
          // Restore container and chart to a smaller size; TODO: restore it to previous size (ie. maybe save the ht/width to scope ?)
          widget.maximized = false;

          var widthRestored = widget.fixedSize.width;         //(pixelWidth * .33).toString() + 'px';
          var heightRestored = widget.fixedSize.height;

          $scope.widget.setHeight(heightRestored + 'px');
          widget.setWidth(widthRestored);

          $scope.$emit('widgetChanged', widget);
          //$scope.$apply();

          var wid = widgetElm.width();
          var ht = widgetElm.height();

          if (chart != undefined) {
            chart.setOptions({ chartArea: { width: wid * .95, height: ht * .90 } });
            chart.resize($(".k-chart"));
          }
          if (treelist != undefined) {
            treelist.expand($("#treelist tbody>tr:eq(0)"));
            treelist.options.height = ht;              // treelist height to the bottom of its container.

            var maxht = $('#treelist .k-grid-content').css('max-height');

            //$('#treelist .k-grid-content').css('max-height', ht + 'px'); // see tree-list.html template

            treelist.refresh();
          }
        }
        // **** KENDO REFRESH TIMER ***
        kendoRefreshTimer();  // 10/21/2015 BM:
      }
      $scope.grabResizer = function (e) {

        var widget = $scope.widget;
        var widgetElm = $element.find('.widget');

        // ignore middle- and right-click
        if (e.which !== 1) {
          return;
        }

        e.stopPropagation();
        e.originalEvent.preventDefault();

        // get the starting horizontal position
        var initX = e.clientX;
        // console.log('initX', initX);

        // Get the current width of the widget and dashboard
        var pixelWidth = widgetElm.width();
        var pixelHeight = widgetElm.height();
        var widgetStyleWidth = widget.containerStyle.width;
        var widthUnits = widget.widthUnits;
        var unitWidth = parseFloat(widgetStyleWidth);

        // create marquee element for resize action
        var $marquee = angular.element('<div class="widget-resizer-marquee" style="height: ' + pixelHeight + 'px; width: ' + pixelWidth + 'px;"></div>');
        widgetElm.append($marquee);

        // determine the unit/pixel ratio
        var transformMultiplier = unitWidth / pixelWidth;

        // updates marquee with preview of new width
        var mousemove = function (e) {
          var curX = e.clientX;
          var pixelChange = curX - initX;
          var newWidth = pixelWidth + pixelChange;
          $marquee.css('width', newWidth + 'px');
        };

        // sets new widget width on mouseup
        var mouseup = function (e) {
          // remove listener and marquee
          jQuery($window).off('mousemove', mousemove);

          jQuery($window).on("resize", function () {    // attempt to refresh Kendo chart - 3/16/2015 BM:
            kendo.resize($(".k-chart"));
          });
          $marquee.remove();

          // calculate change in units
          var curX = e.clientX;
          var pixelChange = curX - initX;
          var unitChange = Math.round(pixelChange * transformMultiplier * 100) / 100;

          // add to initial unit width
          var newWidth = unitWidth * 1 + unitChange;
          widget.setWidth(newWidth + widthUnits);
          $scope.$emit('widgetChanged', widget);
          $scope.$apply();

          $scope.$broadcast('widgetResized', {
            width: newWidth
          });

          // Kendo chart - width resize to 95%, and refresh - 03/30/2015 BM:
          // fyi: normally the .setOptions() method isn't required upon width resize; I only need after I have already maximized/restored the container; something about 'px' size I think.
          var chart = widgetElm.find('.k-chart').data("kendoChart");
          if (chart != undefined) {
            // don't use 'newWidth' here, as it might be a pct
            chart.setOptions({ chartArea: { width: widgetElm.width() * .95 } });
            kendo.resize($(".k-chart"));
          }
        };

        jQuery($window).on('mousemove', mousemove).one('mouseup', mouseup);
      };

      //TODO refactor
      $scope.grabSouthResizer = function (e) {
        var widgetElm = $element.find('.widget');

        // ignore middle- and right-click
        if (e.which !== 1) {
          return;
        }

        e.stopPropagation();
        e.originalEvent.preventDefault();

        // get the starting horizontal position
        var initY = e.clientY;
        // console.log('initX', initX);

        // Get the current width of the widget and dashboard
        var pixelWidth = widgetElm.width();
        var pixelHeight = widgetElm.height();

        // create marquee element for resize action
        var $marquee = angular.element('<div class="widget-resizer-marquee" style="height: ' + pixelHeight + 'px; width: ' + pixelWidth + 'px;"></div>');
        widgetElm.append($marquee);

        // updates marquee with preview of new height
        var mousemove = function (e) {
          var curY = e.clientY;
          var pixelChange = curY - initY;
          var newHeight = pixelHeight + pixelChange;
          $marquee.css('height', newHeight + 'px');
        };

        // sets new widget width on mouseup
        var mouseup = function (e) {
          // remove listener and marquee
          jQuery($window).off('mousemove', mousemove);
          $marquee.remove();

          // calculate height change
          var curY = e.clientY;
          var pixelChange = curY - initY;

          //var widgetContainer = widgetElm.parent(); // widget container responsible for holding widget width and height
          var widgetContainer = widgetElm.find('.widget-content');

          var diff = pixelChange;
          var height = parseInt(widgetContainer.css('height'), 10);
          var newHeight = (height + diff);

          //$scope.widget.style.height = newHeight + 'px';

          $scope.widget.setHeight(newHeight + 'px');

          $scope.$emit('widgetChanged', $scope.widget);
          $scope.$apply(); // make AngularJS to apply style changes

          $scope.$broadcast('widgetResized', {
            height: newHeight
          });
          // kendo chart - refresh height - 03/30/2015 BM:
          var chart = widgetElm.find('.k-chart').data("kendoChart");
          if (chart != undefined) {
            chart.setOptions({ chartArea: { height: newHeight - (newHeight * .10) } });
            chart.resize($(".k-chart"));
          }
        };

        jQuery($window).on('mousemove', mousemove).one('mouseup', mouseup);
      };

      // replaces widget title with input
      $scope.editTitle = function (widget) {
        var widgetElm = $element.find('.widget');
        widget.editingTitle = true;
        // HACK: get the input to focus after being displayed.
        $timeout(function () {
          widgetElm.find('form.widget-title input:eq(0)').focus()[0].setSelectionRange(0, 9999);
        });
      };

      // saves whatever is in the title input as the new title
      $scope.saveTitleEdit = function (widget) {
        widget.editingTitle = false;
        $scope.$emit('widgetChanged', widget);
      };

      $scope.compileTemplate = function () {
        // $element represents the div which contains: ng-repeat="widget in widgets" in the dashboard.html template
        var container = $scope.findWidgetContainer($element);
        var templateString = $scope.makeTemplateString();
        var widgetElement = angular.element(templateString);

        container.empty();
        container.append(widgetElement);
        $compile(widgetElement)($scope);
      };

      $scope.findWidgetContainer = function (element) {
        // widget placeholder is the first (and only) child of .widget-content
        return element.find('.widget-content');
      };


      /************************** KENDO REFRESH TIMER !!! **********************************/
      var timer;
      function kendoRefreshTimer() {
        timer = $timeout(function () {
          refreshKendo();
        }, 1);
      }

      function refreshKendo() {
        var widget = $scope.widget;
        var widgetElm = $element.find('.widget');

        var pixelHeight = widgetElm.height();
        var pixelWidth = widgetElm.width();

        // height differential (reduce height of container if inner widget is a treelist)
        //var ht_diff = (chart != undefined ? 200 : 600);
        //var newHeight = window.innerHeight - ht_diff;

        var radial = widgetElm.find('.radial-gauge');
        if (radial.length != 0) {
          kendoRefreshFactory.refreshRadialGauge($scope, radial);
        }
        var radial = widgetElm.find('.linear-gauge');
        if (radial.length != 0) {
          kendoRefreshFactory.refreshLinearGauge($scope, radial);
        }

        // fyi: '.k-tree' will auto-resize, so no need to find that
        var chart = widgetElm.find('.k-chart').data("kendoChart");
        if (chart != undefined) {
          // refresh Kendo chart height/widget within the container, keeping it to 90% of ht/wt for better chart rendering
          chart.setOptions({ chartArea: { height: widgetElm.height() * .9, width: widgetElm.width() * .95 } });
          chart.resize($(".k-chart"));
        }

        var treelist = widgetElm.find('.k-treelist').data("kendoTreeList");
        if (treelist != undefined) {
          if (widget.chartType == 'treelist') {
            treelist.expand($("#treelist tbody>tr:eq(0)"));
            treelist.options.height = treelist.getSize().height;
            treelist.refresh();
          }
        }

        var treemap = widgetElm.find('.k-treemap').data("kendoTreeMap");
        if (treemap != undefined) {
          //treemap.options.height = treemap.getSize().height;
          //treemap.options.height = widgetElm.height();        // WHICH ONE ???
          //treemap.resize();
          kendoRefreshFactory.refreshTreeMap($scope, treemap);
        }

        $timeout.cancel(timer);

        return;
      }

      /* END: ************************* KENDO REFRESH LOGIC **********************************/
    }
  ]);