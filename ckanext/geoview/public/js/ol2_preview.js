// Openlayers preview module

(function() {

    var $_ = _ // keep pointer to underscore, as '_' will may be overridden by a closure variable when down the stack

    this.ckan.module('olpreview', function (jQuery, _) {


        OpenLayers.Control.CKANLayerSwitcher = OpenLayers.Class(OpenLayers.Control.LayerSwitcher,
            {
                redraw: function () {
                    //if the state hasn't changed since last redraw, no need
                    // to do anything. Just return the existing div.
                    if (!this.checkRedraw()) {
                        return this.div;
                    }

                    //clear out previous layers
                    this.clearLayersArray("base");
                    this.clearLayersArray("data");

                    var containsOverlays = false;
                    var containsBaseLayers = false;

                    // Save state -- for checking layer if the map state changed.
                    // We save this before redrawing, because in the process of redrawing
                    // we will trigger more visibility changes, and we want to not redraw
                    // and enter an infinite loop.
                    this.layerStates = this.map.layers.map(function (layer) {
                        return {
                            'name': layer.name,
                            'visibility': layer.visibility,
                            'inRange': layer.inRange,
                            'id': layer.id
                        };
                    })

                    var layers = this.map.layers.slice().filter(function (layer) {
                        return layer.displayInLayerSwitcher
                    });
                    if (!this.ascending) {
                        layers.reverse();
                    }

                    for (var i = 0; i < layers.length; i++) {
                        var layer = layers[i];
                        var baseLayer = layer.isBaseLayer;

                        if (baseLayer) containsBaseLayers = true;
                        else containsOverlays = true;

                        // only check a baselayer if it is *the* baselayer, check data
                        //  layers if they are visible
                        var checked = (baseLayer) ? (layer == this.map.baseLayer) : layer.getVisibility();

                        // create input element
                        var inputElem = document.createElement("input"),
                        // The input shall have an id attribute so we can use
                        // labels to interact with them.
                            inputId = OpenLayers.Util.createUniqueID(this.id + "_input_");

                        inputElem.id = inputId;
                        inputElem.name = (baseLayer) ? this.id + "_baseLayers" : layer.name;
                        inputElem.type = (baseLayer) ? "radio" : "checkbox";
                        inputElem.value = layer.name;
                        inputElem.checked = checked;
                        inputElem.defaultChecked = checked;
                        inputElem.className = "olButton";
                        inputElem._layer = layer.id;
                        inputElem._layerSwitcher = this.id;
                        inputElem.disabled = !baseLayer && !layer.inRange;

                        // create span
                        var labelSpan = document.createElement("label");
                        // this isn't the DOM attribute 'for', but an arbitrary name we
                        // use to find the appropriate input element in <onButtonClick>
                        labelSpan["for"] = inputElem.id;
                        OpenLayers.Element.addClass(labelSpan, "labelSpan olButton");
                        labelSpan._layer = layer.id;
                        labelSpan._layerSwitcher = this.id;
                        if (!baseLayer && !layer.inRange) {
                            labelSpan.style.color = "gray";
                        }
                        labelSpan.innerHTML = layer.title || layer.name;
                        labelSpan.style.verticalAlign = (baseLayer) ? "bottom"
                            : "baseline";


                        var groupArray = (baseLayer) ? this.baseLayers
                            : this.dataLayers;
                        groupArray.push({
                            'layer': layer,
                            'inputElem': inputElem,
                            'labelSpan': labelSpan
                        });


                        var groupDiv = $((baseLayer) ? this.baseLayersDiv
                            : this.dataLayersDiv);
                        groupDiv.append($("<div></div>").append($(inputElem)).append($(labelSpan)));
                    }

                    // if no overlays, dont display the overlay label
                    this.dataLbl.style.display = (containsOverlays) ? "" : "none";

                    // if no baselayers, dont display the baselayer label
                    this.baseLbl.style.display = (containsBaseLayers) ? "" : "none";

                    return this.div;
                }
            }
        );


        var layerExtractors = {

            'kml': function (resource, proxyUrl, proxyServiceUrl, layerProcessor) {
                var url = proxyUrl || resource.url;
                layerProcessor(OL_HELPERS.createKMLLayer(url));
            },
            'gml': function (resource, proxyUrl, proxyServiceUrl, layerProcessor) {
                var url = proxyUrl || resource.url;
                layerProcessor(OL_HELPERS.createGMLLayer(url));
            },
            'geojson': function (resource, proxyUrl, proxyServiceUrl, layerProcessor) {
                var url = proxyUrl || resource.url;
                layerProcessor(OL_HELPERS.createGeoJSONLayer(url));
            },
            'wfs': function(resource, proxyUrl, proxyServiceUrl, layerProcessor) {
                var parsedUrl = resource.url.split('#');
                var url = proxyServiceUrl || parsedUrl[0];

                var ftName = parsedUrl.length > 1 && parsedUrl[1];
                OL_HELPERS.withFeatureTypesLayers(url, layerProcessor, ftName);
            },
            'wms' : function(resource, proxyUrl, proxyServiceUrl, layerProcessor) {
                var parsedUrl = resource.url.split('#');
                var directGetMapUrl = parsedUrl[0].split('?')[0]; // remove query if any
                var url = proxyServiceUrl || directGetMapUrl;
                var layerName = parsedUrl.length > 1 && parsedUrl[1];
                // Use the proxy if available for the tiles to prevent mixed secure/insecure content
                OL_HELPERS.withWMSLayers(url, url, layerProcessor, layerName);
            },
            'esrigeojson': function (resource, proxyUrl, proxyServiceUrl, layerProcessor) {
                var url = proxyUrl || resource.url;
                layerProcessor(OL_HELPERS.createEsriGeoJSONLayer(url));
            },
            'arcgis_rest': function(resource, proxyUrl, proxyServiceUrl, layerProcessor) {
                var parsedUrl = resource.url.split('#');
                var url = proxyServiceUrl || parsedUrl[0];

                var layerName = parsedUrl.length > 1 && parsedUrl[1];

                OL_HELPERS.withArcGisLayers(parsedUrl[0], layerProcessor, layerName);
            },
            'gft': function (resource, proxyUrl, proxyServiceUrl, layerProcessor) {
                var tableId = OL_HELPERS.parseURL(resource.url).query.docid;
                layerProcessor(OL_HELPERS.createGFTLayer(tableId, ckan.geoview.gapi_key));
            }
        }

        var withLayers = function (resource, proxyUrl, proxyServiceUrl, layerProcessor) {

            var withLayers = layerExtractors[resource.format && resource.format.toLocaleLowerCase()];
            withLayers && withLayers(resource, proxyUrl, proxyServiceUrl, layerProcessor);
        }

        return {
            options: {
                i18n: {
                }
            },

            initialize: function () {
                jQuery.proxyAll(this, /_on/);
                this.el.ready(this._onReady);
            },

            addLayer: function (resourceLayer) {

                if (this.options.ol_config.hide_overlays &&
                    this.options.ol_config.hide_overlays.toLowerCase() == "true") {
                    resourceLayer.setVisibility(false);
                }

                this.map.addLayer(resourceLayer)

                var bbox = resourceLayer.getDataExtent && resourceLayer.getDataExtent()
                if (bbox) {
                    if (this.map.getExtent()) this.map.getExtent().extend(bbox)
                    else this.map.zoomToExtent(bbox)
                }
                else {
                    var firstExtent = false
                    resourceLayer.events.register(
                        "loadend",
                        resourceLayer,
                        function (e) {
                            if (!firstExtent) {
                                var bbox = e && e.object && e.object.getDataExtent && e.object.getDataExtent()
                                if (bbox)
                                    if (this.map.getExtent()) this.map.getExtent().extend(bbox)
                                    else this.map.zoomToExtent(bbox)
                                else
                                    this.map.zoomToMaxExtent()
                                firstExtent = true
                            }
                        })
                }

            },

            _commonBaseLayer: function(mapConfig) {
                /*
                Return an OpenLayers base layer to be used depending on CKAN wide settings

                TODO: factor out somewhere it can be reused by other modules.

                */

                var baseMapLayer;
                var urls;
                var attribution;

                var isHttps = window.location.href.substring(0, 5).toLowerCase() === 'https';
                if (mapConfig.type == 'mapbox') {
                    // MapBox base map
                    if (!mapConfig['mapbox.map_id'] || !mapConfig['mapbox.access_token']) {
                      throw '[CKAN Map Widgets] You need to provide a map ID ([account].[handle]) and an access token when using a MapBox layer. ' +
                            'See http://www.mapbox.com/developers/api-overview/ for details';
                    }

                    urls = ['//a.tiles.mapbox.com/v4/' + mapConfig['mapbox.map_id'] + '/${z}/${x}/${y}.png?access_token=' + mapConfig['mapbox.access_token'],
                                '//b.tiles.mapbox.com/v4/' + mapConfig['mapbox.map_id'] + '/${z}/${x}/${y}.png?access_token=' + mapConfig['mapbox.access_token'],
                                '//c.tiles.mapbox.com/v4/' + mapConfig['mapbox.map_id'] + '/${z}/${x}/${y}.png?access_token=' + mapConfig['mapbox.access_token'],
                                '//d.tiles.mapbox.com/v4/' + mapConfig['mapbox.map_id'] + '/${z}/${x}/${y}.png?access_token=' + mapConfig['mapbox.access_token'],
                    ];
                    attribution = '<a href="https://www.mapbox.com/about/maps/" target="_blank">&copy; Mapbox &copy; OpenStreetMap </a> <a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a>';
                    baseMapLayer = new OpenLayers.Layer.XYZ('MapBox', urls, {
                        sphericalMercator: true,
                        wrapDateLine: true,
                        attribution: attribution
                    });
                } else if (mapConfig.type == 'custom') {
                    // Custom XYZ layer
                    urls = mapConfig['custom.url'];
                    if (urls.indexOf('${x}') === -1) {
                      urls = urls.replace('{x}', '${x}').replace('{y}', '${y}').replace('{z}', '${z}');
                    }
                    baseMapLayer = new OpenLayers.Layer.XYZ('Base Layer', urls, {
                        sphericalMercator: true,
                        wrapDateLine: true,
                        attribution: mapConfig.attribution
                    });
                } else {
                    // MapQuest OpenStreetMap base map
                    if (isHttps) {
                        var urls = ['//otile1-s.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png',
                                    '//otile2-s.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png',
                                    '//otile3-s.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png',
                                    '//otile4-s.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png'];

                    } else {
                        var urls = ['//otile1.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png',
                                    '//otile2.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png',
                                    '//otile3.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png',
                                    '//otile4.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.png'];
                    }
                    var attribution = mapConfig.attribution || 'Map data &copy; OpenStreetMap contributors, Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="//developer.mapquest.com/content/osm/mq_logo.png">';

                    baseMapLayer = new OpenLayers.Layer.OSM('MapQuest OSM', urls, {
                      attribution: attribution});
                }

                return baseMapLayer;

            },

            _onReady: function () {

                // Choose base map based on CKAN wide config
                var baseMapLayer = this._commonBaseLayer(this.options.map_config);
                var clearBaseLayer = new OpenLayers.Layer.OSM("None", "/img/blank.gif", {isBaseLayer: true, attribution: ''});

                var mapDiv = $("<div></div>").attr("id", "map").addClass("map")
                var info = $("<div></div>").attr("id", "info")
                mapDiv.append(info)

                $("#data-preview").empty()
                $("#data-preview").append(mapDiv)

                info.tooltip({
                    animation: false,
                    trigger: 'manual',
                    placement: "right",
                    html: true
                });

                this.map = new OpenLayers.Map(
                    {
                        div: "map",
                        theme: "/js/vendor/openlayers2/theme/default/style.css",
                        layers: [baseMapLayer, clearBaseLayer],
                        maxExtent: baseMapLayer.getMaxExtent()
                        //projection: Mercator, // this is needed for WMS layers (most only accept 3857), but causes WFS to fail
                    });

                layerSwitcher = new OpenLayers.Control.CKANLayerSwitcher()

                this.map.addControl(layerSwitcher);

                var bboxFrag;
                var fragMap = OL_HELPERS.parseKVP((window.parent || window).location.hash && (window.parent || window).location.hash.substring(1));

                var bbox = (fragMap.bbox && new OpenLayers.Bounds(fragMap.bbox.split(',')).transform(EPSG4326, this.map.getProjectionObject()));
                if (bbox) this.map.zoomToExtent(bbox);

                var proxyUrl = this.options.proxy_url;
                var proxyServiceUrl = this.options.proxy_service_url;

                if (!ckan.geoview) ckan.geoview = {};
                ckan.geoview.googleApiKey = this.options.gapi_key;


                withLayers(preload_resource, proxyUrl, proxyServiceUrl, $_.bind(this.addLayer, this));

                // Expand layer switcher by default
                layerSwitcher.maximizeControl();

            }
        }
    });
})();
OpenLayers.ImgPath = '/js/vendor/openlayers2/img/';
