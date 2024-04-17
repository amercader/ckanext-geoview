/* global ol, $ */
/**
 * Adapted from https://github.com/walkermatt/ol3-layerswitcher
 */
class HilatsLayerSwitcher extends ol.control.Control {
    constructor (opt_options) {
        var options = opt_options || {};

        var parentElement = $("<div class='layer-switcher'></div>")

        super({
            element: parentElement[0],
            target: options.target
        });

        var _this = this;
        this.mapListeners = [];
        this.parentElement = parentElement.hover(
            function(e) {
                _this.showPanel();
            },
            function(e) {
                // deal with FF triggering a mouseout when opening the select dropdown
                // cf https://stackoverflow.com/questions/32561180/keep-hover-triggered-twitter-bootstrap-popover-alive-while-selecting-option-from
                if (!(e.target && e.target.tagName == 'SELECT'))
                    _this.hidePanel();
            }
        );


        this.header = $("<div class='header'></div>");
        var layerList = $("<div class='ol-unselectable ol-control layer-list'><div class='padder'></div></div>");

        var progressIndicator =  $("<div class='stacked-layers'>" +
                                   "<div class='stacked-layer layer-1'></div>" +
                                   "<div class='stacked-layer layer-2'></div>" +
                                   "<div class='stacked-layer layer-3'></div></div>");
        this.parentElement
            .append(progressIndicator)
            .append(this.header)
            .append(layerList);

        this.panel = $("<div class='panel'></div>").appendTo(layerList)[0];
        this.enableTouchScroll_(this.panel);
    };

    /**
     * Show the layer panel.
     */
    showPanel() {
        if (! $(this.panel).is(":visible")) {
            this.parentElement.addClass('active');
            this.renderPanel();
        }
    };

    isLoading(toggle) {
        $(this.element).find('.stacked-layer').toggleClass('animated', toggle)
    };

    /**
     * Hide the layer panel.
     */
    hidePanel() {
        this.parentElement.removeClass('active');
    };

    /**
     * Re-draw the layer panel to represent the current state of the layers.
     */
    renderPanel() {

        this.ensureTopVisibleBaseLayerShown_();

        $(this.header).empty()
            .append(this.renderBaseLayerSelector());

        this.renderLayersList(this.getMap().getLayers().getArray().slice().reverse())
            .appendTo($(this.panel).empty())

        $(this.header).find("select").width($(this.panel).width() - 40)

    };

    setMap(map) {
        super.setMap(map);
        if (map) {
            this.renderPanel();
        }
    };

    renderBaseLayerSelector() {
        var _this = this;
        var $select = $("<select></select>")
            .change(function(e) {
                var layer = $(e.target).find(":selected").prop("layer");
                _this.switchBaseLayer(layer)
            })
        return $("<div class='baseLayerSelector'></div>")
            .append($select);
    };

    renderBaseLayer(baselayer) {
        var $select = $(this.header).find(".baseLayerSelector select");

        // use title to identify basemaps; ol_uid is not available in non-debug OL
        $select.append(
            $('<option/>', {value: baselayer.get('title')})
                .prop("layer", baselayer)
                .text(baselayer.get('title'))
        )

        if (baselayer.getVisible())
            $select.val(baselayer.get('title'));

    };

    switchBaseLayer(baselayer) {
        // hide all base layers
        forEachRecursive(this.getMap(), function(l, idx, a) {
            if (l.get('type') === 'base') {
                l.setVisible(false);
            }
        });

        //switch projection
        var newProjection = baselayer.getSource() && baselayer.getSource().getProjection();
        if (newProjection) {
            var currentView = this.getMap().getView();
            var currentExtent = currentView.calculateExtent();
            var newExtent = ol.proj.transformExtent(currentExtent, currentView.getProjection(), newProjection);
            var newView = new ol.View({
                projection: newProjection
            })
            this.getMap().setView(newView);

            // doing setView messes with the extent
            // --> set extent after
            newView.fit(newExtent, {constrainResolution: false});
        }


        // display base layer
        baselayer.setVisible(true);

    };

    /**
     * Ensure only the top-most base layer is visible if more than one is visible.
     * @private
     */
    ensureTopVisibleBaseLayerShown_() {
        var lastVisibleBaseLyr;
        forEachRecursive(this.getMap(), function(l, idx, a) {
            if (l.get('type') === 'base' && l.getVisible()) {
                lastVisibleBaseLyr = l;
            }
        });
        if (lastVisibleBaseLyr) this.setVisible_(lastVisibleBaseLyr, true);
    };

    /**
     * Toggle the visible state of a layer.
     * Takes care of hiding other layers in the same exclusive group if the layer
     * is toggle to visible.
     * @private
     * @param {ol.layer.Base} The layer whos visibility will be toggled.
     */
    setVisible_(lyr, visible) {
        var map = this.getMap();
        lyr.setVisible(visible);
        if (visible && lyr.get('type') === 'base') {
            // Hide all other base layers regardless of grouping
            forEachRecursive(map, function(l, idx, a) {
                if (l != lyr && l.get('type') === 'base') {
                    l.setVisible(false);
                }
            });
        }
    };

    renderLayer(lyr, container) {

        if (lyr.get('type') === 'base') {
            this.renderBaseLayer(lyr)
            return;
        }

        var this_ = this;

        var li = $("<li></li>")

        var label = $("<span class='title'></span>").text(lyr.get('title'))
        if (lyr.getLayers) {

            li.append(label.addClass('group'));
            var layerList = this.renderLayersList(lyr.getLayers().getArray().slice().reverse())
            li.append(layerList);

        } else {

            li.addClass('layer');
            var input = $("<input>")
                .prop("checked", lyr.get('visible'))
                .attr("type", 'checkbox')
                .change(function(e) {this_.setVisible_(lyr, e.target.checked)})
                .appendTo(li);
            li.append(label);

            var stateListener = function() {
                if (lyr.getSource().getState() == ol.source.State.LOADING ||
                    lyr.getSource().get('HL_state') == ol.source.State.LOADING) {
                    li.append("<div class='state simple_loader' style='display: inline-block; float:right'></div>")
                } else if (lyr.getSource().getState() == ol.source.State.ERROR) {
                    li.append("<i class='state fa fa-error' />")
                } else {
                    li.find(".state").remove();
                }
            };

            stateListener();

            lyr.getSource().on('change:HL_state', stateListener);
        }

        if (container)
            li.appendTo(container)

        return li;

    };

    /**
     * Render all layers that are children of a group.
     * @private
     * @param {ol.layer.Group} lyr Group layer whos children will be rendered.
     * @param {Element} elm DOM element that children will be appended to.
     */
    renderLayersList(layers) {
        var _this = this;
        var $list = $("<ul></ul>")
        layers.forEach(function(l) {
            if (l.get('title')) {
                _this.renderLayer(l, $list);
            }
        });
        return $list;
    };


    /**
     * @private
     * @desc Apply workaround to enable scrolling of overflowing content within an
     * element. Adapted from https://gist.github.com/chrismbarr/4107472
     */
    enableTouchScroll_(elm) {
        if(this.isTouchDevice_()){
            var scrollStartPos = 0;
            elm.addEventListener("touchstart", function(event) {
                scrollStartPos = this.scrollTop + event.touches[0].pageY;
            }, false);
            elm.addEventListener("touchmove", function(event) {
                this.scrollTop = scrollStartPos - event.touches[0].pageY;
            }, false);
        }
    };

    /**
     * @private
     * @desc Determine if the current browser supports touch events. Adapted from
     * https://gist.github.com/chrismbarr/4107472
     */
    isTouchDevice_(){
        try {
            document.createEvent("TouchEvent");
            return true;
        } catch(e) {
            return false;
        }
    };

}
ol.control.HilatsLayerSwitcher = HilatsLayerSwitcher;


/**
 * **Static** Call the supplied function for each layer in the passed layer group
 * recursing nested groups.
 * @param {ol.layer.Group} lyr The layer group to start iterating from.
 * @param {Function} fn Callback which will be called for each `ol.layer.Base`
 * found under `lyr`. The signature for `fn` is the same as `ol.Collection#forEach`
 */
const forEachRecursive = function(lyr, fn) {
    lyr.getLayers().forEach(function(lyr, idx, a) {
        fn(lyr, idx, a);
        if (lyr.getLayers) {
            forEachRecursive(lyr, fn);
        }
    });
};
