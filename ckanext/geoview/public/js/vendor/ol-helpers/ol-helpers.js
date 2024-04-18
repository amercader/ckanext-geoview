/* globals ol, proj4 */
// Openlayers preview module

if (typeof proj4 != "undefined" && proj4) {
    window.Proj4js = {
        Proj: function (code) {

            if (Proj4js.defs[code])
                return proj4(Proj4js.defs[code]);

            var shortCode = code.replace(
                /urn:ogc:def:crs:(\w+):(.*:)?(\w+)$/, "$1:$3"
            )
            // side-effect : add long-form code as alias
            if (code != shortCode)
                Proj4js.defs(code, Proj4js.defs[shortCode]);
            return Proj4js.defs[shortCode] && proj4(Proj4js.defs[shortCode]);
        },
        defs: proj4.defs,
        transform: proj4
    };
}

if (!ol.source.State) {
    ol.source.State = {
        UNDEFINED: 'undefined',
        LOADING: 'loading',
        READY: 'ready',
        ERROR: 'error'
    };
}

/* override source state property with internal value to have finer event listening on layer loading */
var OLgetState = ol.source.Vector.prototype.getState;
ol.source.Vector.prototype.getState = function() {
    return this.get('HL_state') || OLgetState.call(this);
};
ol.source.Vector.prototype.setState = function(state) {
    this.set('HL_state', state);

    // listeners on 'change' will not trigger on 'change:HL_state'. Must issue a 'change' explicitly
    this.changed();
};

String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

if (window.Proj4js) {
    // add your projection definitions here
    // definitions can be found at http://spatialreference.org/ref/epsg/{xxxx}/proj4js/

    proj4.defs['OGC:CRS84'] = proj4.defs['EPSG:4326']

    // add EPSG:4326 as coming from GML, to allow for geometry transforms performed by format.GML
    proj4.defs['http://www.opengis.net/gml/srs/epsg.xml#4326'] = proj4.defs['EPSG:4326']

    // warn : 31370 definition from spatialreference.org is wrong
    proj4.defs("EPSG:31370", "+proj=lcc +lat_1=51.16666723333333 +lat_2=49.8333339 +lat_0=90 +lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.868628,52.297783,-103.723893,0.336570,-0.456955,1.842183,-1.2747 +units=m +no_defs");

    proj4.defs("EPSG:28992", "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.999908 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs <>");
    proj4.defs("EPSG:3812", "+proj=lcc +lat_1=49.83333333333334 +lat_2=51.16666666666666 +lat_0=50.797815 +lon_0=4.359215833333333 +x_0=649328 +y_0=665262 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

}

// duplicate this code to avoid a dependency on internal class ol.<...>.Projection_
var createEPSG4326Proj = function(code, opt_axisOrientation) {
    return new ol.proj.Projection({
        code: code,
        units: ol.proj.get('EPSG:4326').getUnits(),
        extent: ol.proj.get('EPSG:4326').getExtent(),
        axisOrientation: opt_axisOrientation,
        global: true,
        metersPerUnit: ol.proj.get('EPSG:4326').getMetersPerUnit(),
        worldExtent: ol.proj.get('EPSG:4326').getWorldExtent()
    })
}

// redefine GML EPSG:4326 with lon/lat axis order;
// Don't do that. Force usage of EPSG4326_LONLAT in format.GML instead
//ol.proj.addProjection(createEPSG4326Proj('http://www.opengis.net/gml/srs/epsg.xml#4326', 'enu'));

// Define a special projection with lon/lat axis order to be used in format.GML hack
ol.proj.addProjection(createEPSG4326Proj('EPSG:4326:LONLAT', 'enu'));

(function() {

    // Establish the root object, `window` in the browser, or `global` on the server.
    var root = this;
    var OL_HELPERS = root.OL_HELPERS = {
        // this is currently used only for geojson parsing
        FEATURE_GEOM_PROP : '_HILATS_Geometry',
        DEFAULT_STYLEMAP : {
            default : [
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'white',
                        width: 4
                    })}),
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#3399CC',
                        width: 2.5
                    }),
                    image: new ol.style.Circle({
                        radius: 5,
                        stroke: new ol.style.Stroke({
                            color: '#3399CC',
                            width:1.5
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(255,255,255,0.4)'
                        })
                    })
                })],

            highlight : [
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'white',
                        width: 4
                    })}),
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#2288FF',
                        width: 2.5
                    }),
                    image: new ol.style.Circle({
                        radius: 5,
                        stroke: new ol.style.Stroke({
                            color: 'blue',
                            width: 3
                        })
                    })
                })],
            selected : [
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'white',
                        width: 5
                    })}),
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: 'green',
                        width: 3
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(255, 255, 255, 0.1)'
                    }),
                    image: new ol.style.Circle({
                        radius: 5,
                        fill: new ol.style.Fill({
                            color: 'rgba(255, 255, 255, 0.1)'
                        }),
                        stroke: new ol.style.Stroke({
                            color: 'green',
                            width: 3
                        })
                    })
                }) ]
        }
    };

    var $_ = _ // keep pointer to underscore, as '_' will may be overridden by a closure variable when down the stack

    /* add LonLat 4326 definition as default - TODO: isn't this breaking support of certain services ?*/
    /*
    var EPSG4326_LONGURL = new ol.proj.Projection({
        code: 'http://www.opengis.net/gml/srs/epsg.xml#4326',
        axis: 'enu'
    });
    ol.proj.addEquivalentProjections([ol.proj.get('EPSG:4326'), EPSG4326_LONGURL]);
     */

    var EPSG4326 = OL_HELPERS.EPSG4326 = ol.proj.get("EPSG:4326")
    var EPSG4326_LONG = OL_HELPERS.EPSG4326_LONG = ol.proj.get('urn:ogc:def:crs:EPSG:6.6:4326')
    var EPSG4326_LONLAT = OL_HELPERS.EPSG4326_LONLAT = createEPSG4326Proj('EPSG:4326', 'enu')
    var EPSG4326_LATLON = OL_HELPERS.EPSG4326_LATLON = createEPSG4326Proj('EPSG:4326', 'neu')
    var Mercator = OL_HELPERS.Mercator = ol.proj.get("EPSG:3857")
    var WORLD_BBOX = OL_HELPERS.WORLD_BBOX = [-180, -90, 180, 90]
    var WORLD_BBOX_MERCATOR = OL_HELPERS.WORLD_BBOX_MERCATOR = ol.proj.transformExtent(OL_HELPERS.WORLD_BBOX, OL_HELPERS.EPSG4326, OL_HELPERS.Mercator)

    var MAX_FEATURES = 300

    var isNumeric = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    var unnamespace = function(str) {
        if (!str)
            return str;

        var idx = str.indexOf(':');
        return idx < 0 ? str : str.substring(idx+1);
    }

    // When possible, override decimal parsers, as some capabilities use commas as decimal separator
    // (e.g. http://geoservices.wallonie.be/arcgis/services/EAU/ALEA_2016/MapServer/WMSServer)
    var originalReadDecimal = ol.format && ol.format.XSD && ol.format.XSD.readDecimalString;
    if (originalReadDecimal) {
        ol.format.XSD.readDecimalString = function (string) {
            if (string) {
                string = string.replace(',', '.');
            }
            return originalReadDecimal(string);
        };
    }

    var INCHES_PER_UNIT = {
        'm': 39.37,
        'degrees': 4374754
    };
    var DOTS_PER_INCH = 72;

    OL_HELPERS.getScaleFromResolution = function(resolution, units, opt_round) {
        var scale = INCHES_PER_UNIT[units] * DOTS_PER_INCH * resolution;
        if (opt_round) {
            scale = Math.round(scale);
        }
        return scale;
    };

    ol.Map.prototype.getScale = function(opt_round) {
        return OL_HELPERS.getScaleFromResolution(this.getView().getResolution(), this.getView().getProjection().getUnits(), opt_round);
    };


    ol.Map.prototype.addLayerWithExtent = function (layer) {
        this.addLayer(layer)

        // fit to layer extent only if layer visible
        if (layer.getVisible() && layer.getSource()) {

            var _view = this.getView();
            var zoomToExtent = function() {
                var projectedBbox;
                var wgs84bbox = layer.getSource().getFullExtent && layer.getSource().getFullExtent();
                if (wgs84bbox) {
                    projectedBbox = ol.proj.transformExtent(wgs84bbox, OL_HELPERS.EPSG4326, _view.getProjection())
                } else {
                    // is getExtent always in view projection? yes for vector sources
                    projectedBbox = layer.getSource().getExtent && layer.getSource().getExtent();
                }

                // sometimes the capabilities are wrong and the bbox is absent
                if (projectedBbox &&
                    isNumeric(projectedBbox[0]) &&
                    isNumeric(projectedBbox[1]) &&
                    isNumeric(projectedBbox[2]) &&
                    isNumeric(projectedBbox[3]))

                    _view.fit(projectedBbox, {constrainResolution: false})
                else {
                    console.warn("Adding layer : could not find extent to zoom to")
                }
            }


            var loading = $.Deferred();
            if (! layer.getSource().get('waitingOnFirstData'))
                loading.resolve();
            else {
                var listenerKey = layer.getSource().on('change', function(e) {
                    if (layer.getSource().getState() == 'ready') {
                        ol.Observable.unByKey(listenerKey);
                        loading.resolve();
                    }
                });
            }

            return loading.then(zoomToExtent)
        }

    }

    /**
     * Override loadFeatures to implement max features cap.
     * Take into account return value of loader func and reload new batches of data when needed
     */
    /*
     ol.source.Vector.prototype.loadFeatures = function(
     extent, resolution, projection) {
     var loadedExtentsRtree = this.loadedExtentsRtree_;
     var extentsToLoad = this.strategy_(extent, resolution);
     var i, ii;
     for (i = 0, ii = extentsToLoad.length; i < ii; ++i) {
     var extentToLoad = extentsToLoad[i];
     var alreadyLoaded = loadedExtentsRtree.forEachInExtent(extentToLoad,
     function(object) {
     // return true if new extent is contained in a fully loaded extent
     // or if new extent contains a partially loaded extent
     return (object.extentCovered && ol.extent.containsExtent(object.extent, extentToLoad)) ||
     (!object.extentCovered && ol.extent.containsExtent(extentToLoad, object.extent));
     });
     if (!alreadyLoaded) {
     // return value of loader is true if extent was partially loaded (due to max features cap)
     var promise = this.loader_.call(this, extentToLoad, resolution, projection);
     var insertExtentFn = function(extentCovered) {
     loadedExtentsRtree.insert(extentToLoad, {extent: extentToLoad.slice(), extentCovered: extentCovered});
     }
     if (promise) {
     promise.then(
     function(extentPartiallyCovered) { insertExtentFn(!extentPartiallyCovered) },
     function(err) { insertExtentFn(false) });
     } else {
     insertExtentFn(true)
     }

     }
     }
     };
     */




    // Returns the WGS84 bbox
    var getFTSourceExtent = function() {
        var bbox = this.get('ftDescr') && this.get('ftDescr').wgs84bbox;
        return bbox;
    }

    var getFT3SourceExtent = function() {
        var bbox = this.get('ftDescr') && this.get('ftDescr').extent.bbox;
        return bbox;
    }

    var getWMTSSourceExtent = function() {
        var bbox = this.get('mlDescr') && this.get('mlDescr').WGS84BoundingBox;
        return bbox;
    }

    var getWMSSourceExtent = function() {
        //1.1.0 : LatLonBoundingBox
        //1.3   : EX_GeographicBoundingBox
        var bbox = this.get('mlDescr') && this.get('mlDescr').EX_GeographicBoundingBox;
        return bbox;
    }

    var getArcGISVectorExtent = function() {
        var bbox = this.get('arcgisDescr') && this.get('arcgisDescr').bounds;
        return bbox;
    }


    var pendingEPSGRequests = {};
    var searchEPSG = function(query) {
        if (pendingEPSGRequests[query])
            return pendingEPSGRequests[query];

        var deferredResult = pendingEPSGRequests[query] = $.Deferred()

        fetch('https://epsg.io/?format=json&q=' + query).then(function(response) {
            return response.json();
        }).then(function(json) {
            var results = json['results'];
            if (results && results.length > 0) {
                for (var i = 0, ii = results.length; i < ii; i++) {
                    var result = results[i];
                    if (result) {
                        var code = result['code'], name = result['name'],
                            proj4def = result['proj4'], bbox = result['bbox'];
                        if (code && code.length > 0 && proj4def && proj4def.length > 0) {

                            var newProjCode = 'EPSG:' + code;
                            proj4.defs(newProjCode, proj4def);
                            var newProj = ol.proj.get(newProjCode);

                            deferredResult.resolve(newProj);
                        }
                    }
                }
            }
            deferredResult.resolve(undefined); // resolve with an error ?
        });

        return deferredResult.then(function() {
            delete pendingEPSGRequests[query]
        });
    }

    class LoggingMap extends ol.Map {
        constructor(options) {
            super(options);

            this.loadingObjects = []

            this.errorDiv = options.errorDiv
            if (this.errorDiv === undefined) {
                this.errorDiv = $("<div style='color: #511e17; font-size: 12px; padding: 2px 3px; background-color: rgba(255, 235, 131, 0.80);  display: none;'></div>")[0]
            }

            this.msgDiv = options.msgDiv
            if (this.msgDiv === undefined) {
                this.msgDiv = $("<div style='font-size: 12px; padding: 2px 3px; background-color: rgba(255,255,255,0.8); display: none;'></div>")[0]
            }

            this.loadingDiv = options.loadingDiv
            if (this.loadingDiv === undefined) {
                this.loadingDiv = $("<div class='loader' style='font-size: 10px; margin: 40px 40px; z-index: 50; position: absolute; top: 0px;'></div>")[0]
            }
            this.loadingListener = options.loadingListener

            this.loadingDiv && this.getViewport().appendChild(this.loadingDiv);

            var msgContainer = $("<div style='position: absolute; z-index: 50; left: 60px; top:10px;'></div>").appendTo(this.getViewport());
            this.errorDiv && msgContainer.append(this.errorDiv);
            this.msgDiv && msgContainer.append(this.msgDiv);

            this.partiallyLoadedSources = [];
            this.erroredSources = [];

            this.on("change:partiallyLoaded", function() {
                if (this.msgDiv) {
                    if (this.partiallyLoadedSources.length > 0) {
                        var _thisMap = this;
                        var msgDiv = $(this.msgDiv)
                            .text("More features to load ")
                            .append($("<button>Reload in current view</button>").click(function() {
                                _thisMap.partiallyLoadedSources.forEach(function(src) {
                                    src.clear();
                                })
                            }))
                        _thisMap.partiallyLoadedSources.forEach(function(src) {
                            if (src.get('next_page')) {
                                msgDiv.append($("<button>Next page</button>").click(function() {
                                    _thisMap.partiallyLoadedSources.forEach(function(src) {
                                        src.nextPage();
                                    })
                                }))
                            }
                        })
                        this.msgDiv.style.display = '';
                    } else {
                        this.msgDiv.style.display = 'none';
                    }
                }
            });

            this.on("change:erroredSource", _.bind(this.updateErrorStatus, this));
            this.on("change:errors", _.bind(this.updateErrorStatus, this));

            this.updateLoadingStatus();
        };


        logError(err) {
            if (!this.get('errors')) {
                this.set('errors', [err]);
            } else {
                this.get('errors').push(err);
                this.dispatchEvent("change:errors");
            }
        }

        updateErrorStatus() {
            if (this.errorDiv) {
                var errors = this.get('errors');
                var hasErrors = errors && errors.length > 0;

                $(this.errorDiv).empty();

                if (this.erroredSources.length <= 0 && !hasErrors) {
                    this.errorDiv.style.display = 'none';
                }
                else {
                    this.errorDiv.style.display = '';

                    if (this.erroredSources.length > 0) {
                        var _thisMap = this;
                        $(this.errorDiv)
                            .text("Layers in error - See console for details ")
                            .append($("<button>Retry</button>").click(function() {
                                _thisMap.erroredSources.forEach(function(src) {
                                    src.setState(ol.source.State.READY);
                                    src.clear();
                                })
                            }))
                    }
                    else if (hasErrors) {
                        var _this = this;
                        errors.forEach(function(err) {
                            $(_this.errorDiv).append($("<div></div>").text(err))
                        })
                    }
                }
            }
        };

        updateLoadingStatus() {
            if (this.loadingObjects.length == 0) {
                this.loadingDiv && (this.loadingDiv.style.display = 'none');
                this.loadingListener && this.loadingListener(false);
            } else {
                this.loadingDiv && (this.loadingDiv.style.display = '');
                this.loadingListener && this.loadingListener(true);
            }
        };

        addLayer(layer) {
            // UNDONE ??
            super.addLayer.apply(this, arguments)

            var _this = this

            var layerStarts = function(event) {
                var loadingObj = event.tile || event.target || layer.getSource();

                if (event.tile) {
                    layer.getSource().loadingTiles = layer.getSource().loadingTiles || [];
                    layer.getSource().loadingTiles.push(event.tile);
                }

                if (layer.getSource().get('HL_state') != ol.source.State.LOADING)
                    layer.getSource().set('HL_state', ol.source.State.LOADING);

                if (_this.loadingObjects.indexOf(loadingObj) < 0) {
                    _this.loadingObjects.push(loadingObj)
                }
                _this.updateLoadingStatus();
            }

            var layerEnds = function(event) {
                var loadingObj = event.tile || event.target || layer.getSource();

                if (event.tile && layer.getSource().loadingTiles) {
                    var tileIdx = layer.getSource().loadingTiles.indexOf(event.tile);
                    tileIdx >= 0 && layer.getSource().loadingTiles.splice(tileIdx, 1);
                }

                if (!layer.getSource().loadingTiles || layer.getSource().loadingTiles.length == 0) {
                    if (layer.getSource().get('HL_state') != ol.source.State.READY)
                        layer.getSource().set('HL_state', ol.source.State.READY);
                }

                var es_idx = _this.erroredSources.indexOf(loadingObj);
                if (this.getState() == ol.source.State.ERROR) {
                    if (es_idx == -1)
                        _this.erroredSources.push(loadingObj);
                    _this.dispatchEvent("change:erroredSource");
                } else {
                    if (es_idx >= 0) {
                        _this.erroredSources.splice(es_idx, 1);
                        _this.dispatchEvent("change:erroredSource")
                    }
                }

                var pls_idx = _this.partiallyLoadedSources.indexOf(loadingObj);
                if (loadingObj.get && loadingObj.get('partial_load')) {
                    if (pls_idx == -1) {
                        _this.partiallyLoadedSources.push(loadingObj);
                        _this.dispatchEvent("change:partiallyLoaded");
                    }
                } else {
                    if (pls_idx >= 0) {
                        _this.partiallyLoadedSources.splice(pls_idx, 1);
                        _this.dispatchEvent("change:partiallyLoaded")
                    }
                }

                var idx = _this.loadingObjects.indexOf(loadingObj)
                if (idx >= 0) {
                    _this.loadingObjects.splice(idx, 1)
                }
                setTimeout(function() {
                    _this.updateLoadingStatus()
                }, 100);
            }

            //TODO do something special for errors ?
            var layerError = layerEnds

            layer.getSource().on('change', function(e) {
                if (layer.getSource().getState() == ol.source.State.LOADING) {
                    layerStarts.call(this, e)
                } else if (layer.getSource().getState() == ol.source.State.READY)
                {
                    layerEnds.call(this, e)
                } else if (layer.getSource().getState() == ol.source.State.ERROR)
                {
                    layerError.call(this, e)
                }
            });

            layer.on('change:visible', function(e) {
                var pls_idx = _this.partiallyLoadedSources.indexOf(this.getSource());
                if (this.getVisible() && this.getSource().get('partial_load')) {
                    _this.partiallyLoadedSources.push(this.getSource());
                    _this.dispatchEvent("change:partiallyLoaded");
                } else if (!this.getVisible() && pls_idx >= 0) {
                    _this.partiallyLoadedSources.splice(pls_idx, 1);
                    _this.dispatchEvent("change:partiallyLoaded")
                }

                var es_idx = _this.erroredSources.indexOf(this.getSource());
                if (this.getVisible() && this.getSource().getState() == ol.source.State.ERROR) {
                    _this.erroredSources.push(this.getSource());
                    _this.dispatchEvent("change:erroredSource");
                } else if (!this.getVisible() && es_idx >= 0) {
                    _this.erroredSources.splice(es_idx, 1);
                    _this.dispatchEvent("change:erroredSource")
                }
            });

            layer.getSource().on('tileloadstart', layerStarts);
            layer.getSource().on('tileloadend', layerEnds);
            layer.getSource().on('tileloaderror', layerError);
            layer.getSource().on('imageloadstart', layerStarts);
            layer.getSource().on('imageloadend', layerEnds);
            layer.getSource().on('imageloaderror', layerError);

        };
    }
    OL_HELPERS.LoggingMap = LoggingMap;

    /**
     * Options : {
     *     className,
     *     target,
     *     render : () => {render all features} ,
     *     renderFeature : (feature, $elem) => {render feature in $elem}
     * }
     * @param opt_options
     * @constructor
     */
    class FeatureDetailsControl extends ol.control.Control {
        constructor(opt_options) {
            super(opt_options);

            var options = opt_options ? opt_options : {};

            var element = document.createElement('DIV');
            element.className = options.className !== undefined ? options.className : 'ol-feature-details';

            var render = options.render ?
                options.render : OL_HELPERS.FeatureDetailsControl.render;

            ol.control.Control.call(this, {
                element: element,
                render: render,
                target: options.target
            });

            this.renderFeature = options.renderFeature ?
                options.renderFeature : OL_HELPERS.FeatureDetailsControl.renderFeature;


            this.on('change:'+OL_HELPERS.FeatureDetailsControl.PROPERTIES.SELECTED_FEATURES, this.handleFeaturesChanged);

        };

        handleFeaturesChanged() {
            this.render();
        };

        setFeatures(features) {
            if (features instanceof ol.Collection)
                features = features.getArray();
            this.set(OL_HELPERS.FeatureDetailsControl.PROPERTIES.SELECTED_FEATURES, features || []);
        };
    }
    OL_HELPERS.FeatureDetailsControl = FeatureDetailsControl;;

    /**
     * Update the mouseposition element.
     * @param {ol.MapEvent} mapEvent Map event.
     * @this {ol.control.MousePosition}
     * @api
     */
    OL_HELPERS.FeatureDetailsControl.render = function() {
        var htmlContent;

        var selectedFeatures = this.get(OL_HELPERS.FeatureDetailsControl.PROPERTIES.SELECTED_FEATURES) || [];

        var container = $(this.element)

        var _thisControl = this;
        if (selectedFeatures && selectedFeatures.length > 0) {
            var detailsArr = selectedFeatures.map(function(f) {
                var $details = $("<div class='featureDetails'></div>")
                    .prop('feature', f)
                _thisControl.renderFeature(f, $details)

                return $details;
            })
            container.empty().append(detailsArr);
        } else {
            container.empty();
        }

    };

    var urlRegex = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi

    OL_HELPERS.FeatureDetailsControl.renderFeature = function(feature, container) {
        var htmlContent;

        if (feature) {

            var layerTitle = feature && feature.layer && feature.layer.get('title')
            htmlContent = "<div class='name'>" + layerTitle +" : <b>"+ (feature.get('name') || feature.getId()) + "</b></div>";

            htmlContent += "<div class='content'><table>";
            var geomName = feature.getGeometryName();
            feature.getKeys().forEach(function(prop) {
                if (prop != geomName) {
                    var value = feature.get(prop);
                    if ((typeof value == 'string') && value.match(urlRegex))
                        value = "<a href='"+value+"' target='_blank'>"+value+"</a>";
                    htmlContent += "<tr><td class='propKey'>" + prop + "</td><td class='propValue'>" + value + "</td></tr></div>"
                }
            })
            htmlContent += "</table></div>";

            $(container).append($(htmlContent));
        } else {
            // return undefined
        }

    };

    OL_HELPERS.FeatureDetailsControl.PROPERTIES = {
        SELECTED_FEATURES : "selectedFeatures"
    };


    class FeatureInfoOverlay extends ol.Overlay {
        constructor(options) {
            super(options);

            var popupContent = $(this.getElement()).find('.popupContent');
            popupContent.hover(function() {
                popupContent.prop('isHovered', true)
            }, function() {
                popupContent.prop('isHovered', false)
            })

            this.showDetails = options.showDetails;
            this.filter = options.filter;
            this.renderFeaturePopup = options.renderFeaturePopup || function(features, displayDetails) {
                var htmlContent;

                if (displayDetails) {
                    var feature = features[0];

                    var layerTitle = feature && feature.layer && feature.layer.get('title')
                    htmlContent = "<div class='name'>" + layerTitle +" : <b>"+ (feature.get('name') || feature.getId()) + "</b></div>";

                    htmlContent += "<table>";
                    feature.getKeys().forEach(function(prop) {
                        htmlContent += "<tr><td class='propKey'>" + prop + "</td><td class='propValue'>" + feature.get(prop) + "</td></tr></div>"
                    })
                    htmlContent += "</table>"
                } else {
                    htmlContent = "";
                    features.forEach(function(feature) {
                        var layerTitle = feature && feature.layer && feature.layer.get('title')
                        htmlContent += "<div class='name'>" + layerTitle +" : <b>"+ (feature.get('name') || feature.getId()) + "</b></div>";
                    })
                }

                return htmlContent;
            }
            this.computePosition = options.computePosition || function(features, evt) {
                // default positioning : take current cursor pos
                return evt.coordinate;
            }

            this.displayedFeatures = [];

            this.onDisplayedFeaturesChange = options.onDisplayedFeaturesChange;

            this.on('change:map', function(evt) {
                this.HL_handleMapChanged();
            })
        }

        setFeatures(features, displayDetails) {
            if (this.onDisplayedFeaturesChange)
                this.onDisplayedFeaturesChange(this.displayedFeatures, features);

            this.displayedFeatures = features;

            var popupContent = $(this.getElement()).find('.popupContent');

            if (features.length == 0) {
                // if features are no longer hovered, but info element still is, do not hide info
                if (!popupContent.prop("isHovered"))
                    this.setPosition(undefined);
                return;
            }

            var htmlContent = this.renderFeaturePopup(features, displayDetails);

            // do a clean detach to make sure the same element can be re-appended while keeping its listeners
            this.appendedElement && $(this.appendedElement).detach();

            if (typeof htmlContent === 'string') {
                popupContent.html(htmlContent);
            } else {
                popupContent.empty().append(this.appendedElement = htmlContent);
            }

        }

        HL_handleMapChanged() {
            var map = this.getMap();
            var _this = this;
            if (map) {
                map.on('pointermove', function(evt) {

                    var changed = false;
                    var features = [];
                    map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
                        if (layer != null) { // null layer is from unmanaged layers, presumably form Select interaction
                            if (feature && (!_this.filter || _this.filter(feature, layer))) // sometimes feature is undefined (?!)
                                features.push(feature);
                            feature.layer = layer
                            if (_this.displayedFeatures.indexOf(feature) < 0) {
                                changed = true
                            }
                        }
                    });

                    changed = !$_.isEqual(features, _this.displayedFeatures)

                    if (changed) {
                        if (_this.displayDetailsTimeout)
                            clearTimeout(_this.displayDetailsTimeout)
                        _this.setFeatures(features);
                        if (_this.showDetails)
                            _this.displayDetailsTimeout = setTimeout(function() {_this.setFeatures(_this.displayedFeatures, true);}, 500);
                    }

                    if (_this.displayedFeatures.length > 0) {
                        _this.setPosition(_this.computePosition(features, evt));
                    }

                });
            }
        }
    };
    OL_HELPERS.FeatureInfoOverlay = FeatureInfoOverlay;



    /**
     * Parse a comma-separated set of KVP, typically for URL query or fragments
     * @param url
     */
    var parseKVP = OL_HELPERS.parseKVP = function (kvpString) {
        var kvps = (kvpString && kvpString.split("&")) || []
        var kvpMap = {}
        kvps.forEach(function(val, idx) {
            var kv = val.split('=')
            kvpMap[kv[0].toLowerCase()] = kv[1]
        })

        return kvpMap
    }

    var kvp2string = OL_HELPERS.kvp2string = function (map) {
        var result = ""
        for (var key in map) {
            result += (result.length>0?'&':'') + key + "=" + map[key]
        }

        return result
    }

    /**
     * Parse a URL into path, query KVP , hash KVP
     * @param url
     */
    OL_HELPERS.parseURL = function (url) {
        var parts = url.split('?', 2)
        var path = parts[0]
        var query = parts.length > 1 && parts[1]
        var hash
        if (!query) {
            parts = path.split('#', 2)
            path = parts[0]
            hash = parts.length > 1 && parts[1]
        } else {
            parts = query.split('#', 2)
            query = parts[0]
            hash = parts.length > 1 && parts[1]
        }

        return {
            path: path,
            query: parseKVP(query),
            hash: parseKVP(hash)
        }
    }


    var parseArcGisDescriptor = function (url, callback, failCallback) {

        var params = {f: "pjson"};

        fetch(url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params),
            {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.text();
            }
        ).then(
            function(text) {
                var descriptor = JSON.parse(text)
                callback(descriptor)
            }
        ).catch(failCallback ||
                function(ex) {
                    console.warn("Trouble getting ArcGIS descriptor");
                    console.warn(ex);
                }
        )
    }

    var fetchWFSCapas = function (url, callback, failCallback) {


        var params = {
            SERVICE: "WFS",
            REQUEST: "GetCapabilities"
        }
        fetch(url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params),
            {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.text();
            }
        ).then(
            function(text) {
                var capabilities = OL_HELPERS.parseWfsCapabilities($.parseXML(text))
                callback(capabilities)
            }
        ).catch(failCallback || function(ex) {
                console.warn("Trouble getting capabilities doc");
                console.warn(ex);
            })
    }


    var fetchWFSFeatureTypeDescr = function (url, ftName, ver, callback, failCallback) {
        var params = {
            SERVICE: "WFS",
            REQUEST: "DescribeFeatureType",
            TYPENAME: ftName,
            VERSION: ver
        }
        fetch(url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params),
            {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.text();
            }
        ).then(
            function(text) {
                var capabilities = $.parseXML(text);
                callback(OL_HELPERS.parseFeatureTypeDescription(capabilities))
            }
        ).catch(failCallback || function(ex) {
                console.warn("Trouble getting FT description doc");
                console.warn(ex);
            })
    }

    var parseWMSCapas = function (url, version, callback, failCallback) {

        if (version === undefined) {
            // try to force 1.3.0
            return parseWMSCapas(url, "1.3.0", callback, failCallback)
                .catch(function(err) {
                    // if it fails, let the server choose the version
                    return parseWMSCapas(url, "auto", callback, failCallback)
                })
        } else {
            var parser = new ol.format.WMSCapabilities();
            var params = {
                SERVICE: "WMS",
                REQUEST: "GetCapabilities"
            }
            if (version != 'auto' && version)
                params.VERSION = version;

            var url = url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params);

            return fetch(url,
                {method:'GET', credentials: 'include'}
            ).then(
                function(response) {
                    return response.text();
                }
            ).then(_.bind(parser.read, parser)
            ).then(callback)
                .catch(function(err) {
                    var msg = "Failed to read WMS capabilities";
                    console.warn("Failed to read capabilities from "+url);
                    console.warn(err);
                    failCallback && failCallback(msg);

                    return Promise.reject(msg);
                })
        }

    }

    var parseGeoPackage = function (url, callback, failCallback) {

        /*
         var GeoPackage = GeoPackageAPI.GeoPackage
         , GeoPackageManager = GeoPackageAPI.GeoPackageManager
         , GeoPackageConnection = GeoPackageAPI.GeoPackageConnection
         , GeoPackageTileRetriever = GeoPackageAPI.GeoPackageTileRetriever
         , TileBoundingBoxUtils = GeoPackageAPI.TileBoundingBoxUtils
         , BoundingBox = GeoPackageAPI.BoundingBox;
         */

        fetch(url,
            {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.arrayBuffer();
            }
        ).then(
            function(arrayBuffer) {
                var uInt8Array = new Uint8Array(arrayBuffer);
                geopackage.openGeoPackageByteArray(uInt8Array, function(err, geopackage) {
                    callback(geopackage)
                });

            }
        ).catch(failCallback || function(ex) {
                console.warn("Trouble reading geopackage");
                console.warn(ex);
            })

    }

    OL_HELPERS.parseWMTSCapas = function (url, callback, failCallback) {
        var wmtsFormat = new ol.format.WMTSCapabilities();
        var params = {
            SERVICE: "WMTS",
            REQUEST: "GetCapabilities",
            VERSION: "1.0.0"
        };

        fetch(url + (url.indexOf('?')>=0?'&':'?') + kvp2string(params),
            {method:'GET', credentials: 'include'}
        ).then(
            function(response) {
                return response.text();
            }
        ).then(
            function(text) {
                var capabilities = wmtsFormat.read(text);
                callback(capabilities)
            }
        ).catch(failCallback || function(ex) {
                console.warn("Trouble getting capabilities doc");
                console.warn(ex);
            })
    }

    /* Define a custom KML Format that accepts an onread callback
     *  to read global KML metadata (title, description, ...)      */

    OL_HELPERS.format = OL_HELPERS.format || {};
    class _KML extends ol.format.KML {
        constructor (opt_options) {
            super(opt_options);
            this.onread = opt_options && opt_options.onread;
        };

        readDocumentOrFolder_(node, objectStack) {
            var result = super.readDocumentOrFolder_(node, objectStack);
            this.onread && this.onread(node);
            return result;
        };
    }
    OL_HELPERS.format.KML = _KML;

    OL_HELPERS.createKMLLayer = function (url) {

        // use a custom loader to set source state
        var kmlLoader = ol.featureloader.loadFeaturesXhr(
            url,
            new OL_HELPERS.format.KML({
                onread: function(node) {
                    var nameNode = node.querySelector(":scope > name");
                    var name = nameNode && nameNode.textContent;
                    name && kml.set('title', name);
                }
            }),
            function(features, dataProjection) {
                this.addFeatures(features);
                // set source as ready once features are loaded
                this.setState(ol.source.State.READY);
                source.set('waitingOnFirstData', false)
            },
            /* FIXME handle error */ ol.nullFunction);

        var source = new ol.source.Vector({
            loader: function(extent, resolution, projection) {
                // set source as loading before reading the KML
                this.setState(ol.source.State.LOADING);
                return kmlLoader.call(this, extent, resolution, projection)
            }
        });
        //set state as loading to be able to listen on load and grab extent after init
        source.set('waitingOnFirstData', true)

        var kml = new ol.layer.Vector({
            style: OL_HELPERS.DEFAULT_STYLEMAP.default,
            title: 'KML', // TODO extract title from KML
            source: source
        });

        return kml;
    }

    /* TODO_OL4 */
    OL_HELPERS.createGFTLayer = function (tableId, GoogleAPIKey) {
        return new OpenLayers.Layer.Vector(
            "GFT", {
                style: OL_HELPERS.DEFAULT_STYLEMAP.default,
                projection: EPSG4326,
                strategies: [new OpenLayers.Strategy.Fixed()],
                protocol: new OpenLayers.Protocol.Script({
                    url: "https://www.googleapis.com/fusiontables/v1/query",
                    params: {
                        sql: "select * from " + tableId,
                        key: GoogleAPIKey
                    },
                    format: new OpenLayers.Format.GeoJSON({
                        ignoreExtraDims: true,
                        read: function (json) {
                            var row, feature, atts = {}, features = [];
                            var cols = json.columns; // column names
                            for (var i = 0; i < json.rows.length; i++) {
                                row = json.rows[i];
                                feature = new OpenLayers.Feature.Vector();
                                atts = {};
                                for (var j = 0; j < row.length; j++) {
                                    // 'location's are json objects, other types are strings
                                    if (typeof row[j] === "object" && row[j].geometry) {
                                        feature.geometry = this.parseGeometry(row[j].geometry);
                                    } else {
                                        atts[cols[j]] = row[j];
                                    }
                                }
                                feature.data = atts;
                                // if no geometry, not much point in continuing with this row
                                if (feature.geometry) {
                                    features.push(feature);
                                }
                            }
                            return features;
                        }
                    }),
                    callbackKey: "callback"
                }),
                eventListeners: {
                    "featuresadded": function () {
                        this.map.zoomToExtent(this.getDataExtent());
                    }
                }
            })
    }

    /* TODO_OL4 */
    OL_HELPERS.createGMLLayer = function (url) {

        var gml = new OpenLayers.Layer.Vector("GML", {
            style: OL_HELPERS.DEFAULT_STYLEMAP.default,
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: url,
                format: new OpenLayers.Format.GML()
            })
        });

        //TODO styles

        return gml
    }

    /**
     * Removes OGC conflicting URL parameters (service, request, version) and fragment
     * @param url
     */
    OL_HELPERS.cleanOGCUrl = function (url) {
        var urlParts = OL_HELPERS.parseURL(url)
        delete urlParts.query['service']
        delete urlParts.query['request']
        delete urlParts.query['version']
        delete urlParts.query['outputformat']
        delete urlParts.query['typename']

        return urlParts.path + '?' + OL_HELPERS.kvp2string(urlParts.query)

    }

    OL_HELPERS.parseWfsCapabilities = function(xmlDoc) {
        var $capas = $(xmlDoc);

        var ver = $($capas[0].getElementsByTagNameNS('*', 'WFS_Capabilities')).attr('version');
        var featureTypes = $($capas[0].getElementsByTagNameNS('*', 'FeatureType'));
        featureTypes = featureTypes.get().map(function (featureType, idx) {
            var $featureType = $(featureType);

            var bbox;
            // let's be lenient and look for latlonbbox or wgs84bbox regardless of advertised version
            var wgs84bbox = $(featureType.getElementsByTagNameNS('*', 'WGS84BoundingBox'));
            var latlonbbox = $(featureType.getElementsByTagNameNS('*', 'LatLongBoundingBox'));
            if (wgs84bbox.length && wgs84bbox[0].children.length > 0) {
                var ll = $(wgs84bbox[0].getElementsByTagNameNS('*', 'LowerCorner')).text().split(' ');
                var ur = $(wgs84bbox[0].getElementsByTagNameNS('*', 'UpperCorner')).text().split(' ')
                bbox = [parseFloat(ll[0]), parseFloat(ll[1]), parseFloat(ur[0]), parseFloat(ur[1])]
            } else if (latlonbbox.length) {
                bbox = [parseFloat(latlonbbox.attr('minx')), parseFloat(latlonbbox.attr('miny')), parseFloat(latlonbbox.attr('maxx')), parseFloat(latlonbbox.attr('maxy'))]
            }

            return {
                name: $(featureType.getElementsByTagNameNS('*', 'Name')).text(),
                title: $(featureType.getElementsByTagNameNS('*', 'Title')).text(),
                defaultSrs: $(featureType.getElementsByTagNameNS('*', 'DefaultSRS')).text() || $(featureType.getElementsByTagNameNS('*', 'DefaultCRS')).text(),
                otherSrs: $(featureType.getElementsByTagNameNS('*', 'SRS')).text(),
                wgs84bbox: bbox
            }
        })
        return {
            version: ver,
            featureTypes: featureTypes
        }
    }

    OL_HELPERS.parseFeatureTypeDescription = function(xmlDoc) {
        var $descr = $(xmlDoc);

        // WARN extremely fragile and hackish way to parse FT schema
        var props = $descr[0]
            .getElementsByTagNameNS('*', 'complexType')[0]
            .getElementsByTagNameNS('*', 'sequence')[0]
            .getElementsByTagNameNS('*', 'element')

        var featureTypeProperties = $(props).map(function(idx, prop) {
            return {
                type: $(prop).attr('type'),
                name: $(prop).attr('name')
            }
        }).get();

        return {
            properties: featureTypeProperties
        }
    }


    /*
     Known problematic WFS :
     - https://hazards.fema.gov/gis/nfhl/services/public/NFHL/MapServer/WFSServer
     default SRS is 4269, defined with axis order enu
     1. axis order is wrong with
     - (ver=undefined || ver=2.0) && outputformat=GML3
     - ver=1.1.0 && (outputformat==undefined || outputformat=GML3)
     2. GML uses gml:member
     - ver=undefined (defaults to 2.0) && outputformat=undefined
     3. GML advertises 3.2 namespace even if requesting GML2 if
     - ver=undefined && outputformat=GML2
     */


    OL_HELPERS.withFeatureTypesLayers = function (url, layerProcessor, ftNames, map, useGET) {

        if (!Array.isArray(ftNames)) {
            if (typeof ftNames == 'string')
                ftNames = [ftNames];
            else
                ftNames = undefined
        }

        // remove namespaces from feature type names
        // name coming from ISO md is sometimes namespaced, while actual feature type ID is not
        ftNames && (ftNames = ftNames.map(unnamespace));

        var deferredResult = $.Deferred()
        url = OL_HELPERS.cleanOGCUrl(url)
        fetchWFSCapas(
            url,
            function (capas) {

                /* TODO should we have a dedicated WFS parser that handles multiple versions ? */
                var ver = capas.version
                if (ver == "2.0.0")
                    ver = "1.1.0"  // 2.0.0 causes failures in some cases (e.g. Geoserver TOPP States WFS)

                // force GML version to 2.0; GML3 introduces variations in axis order depending on implementations
                var gmlFormatVersion = "GML2";

                var candidates = capas.featureTypes
                if (ftNames) candidates = capas.featureTypes.filter(function (ft) {
                    return ftNames.indexOf(unnamespace(ft.name)) >= 0;
                })

                var deferredLayers = []

                candidates.forEach(function (candidate, idx) {
                    var deferredLayer = $.Deferred();
                    deferredLayers.push(deferredLayer);

                    fetchWFSFeatureTypeDescr(
                        url,
                        candidate.name, /* TODO deal with WFS that require the prefix to be included : candidate.prefixedName */
                        ver,
                        function (descr) {
                            var ftLayer;

                            // WARN extremely fragile and hackish way to parse FT schema
                            try {
                                var featureTypeProperties = descr.properties;
                                if (featureTypeProperties.length) {

                                    var srs;

                                    var defaultSrs = candidate.defaultSrs
                                    var altSrs = candidate.otherSrs
                                    // all SRSs with default at idx 0
                                    var allSrs = (defaultSrs ? [defaultSrs] : []).concat(altSrs || [])

                                    if (allSrs.length > 0) { // sometimes no srs is found (misusage of DefaultSRS in 2.0 version, ...)

                                        // first look for 4326 projection
                                        if (allSrs.indexOf("EPSG:4326") >= 0)
                                            srs = ol.proj.get("EPSG:4326")
                                        else {
                                            for (var srsIdx = 0, length = allSrs.length; srsIdx < length; srsIdx++) {
                                                if (allSrs[srsIdx].match(/urn:ogc:def:crs:EPSG:.*:4326$/)) {
                                                    srs = ol.proj.get(allSrs[srsIdx])
                                                    break;
                                                }
                                            }
                                        }

                                        if (!srs) {
                                            // look for current map projection in advertised projections
                                            if (map && map.getView().getProjection() && allSrs.indexOf(map.getView().getProjection().getCode()) >= 0)
                                                srs = map.getView().getProjection()

                                            // fallback on layer projection, if supported
                                            else if (window.Proj4js && window.Proj4js.Proj(allSrs[0]))
                                                srs = ol.proj.get(allSrs[0])
                                            else {
                                                srs = searchEPSG(allSrs[0].split(':').pop())
                                            }
                                        }
                                    }

                                    if (!(srs && srs.promise)) {
                                        // let's turn this into a promise
                                        srs = $.Deferred().resolve(srs)
                                    }

                                    srs.then(function (resolvedSrs) {

                                        if (!resolvedSrs) {
                                            // no projection found --> try EPSG:4326 anyway, should be supported
                                            resolvedSrs = ol.proj.get("EPSG:4326")
                                        }

                                        var isLonLat4326 = ol.proj.equivalent(resolvedSrs, OL_HELPERS.EPSG4326);
                                        if (ver != "1.0.0" && resolvedSrs.toString().match(/urn:ogc:def:crs:EPSG:.*:4326$/) ||
                                            resolvedSrs.getCode().startsWith("urn:ogc:def:crs:") && resolvedSrs.getUnits() == "degrees") {
                                            // using long form SRS, assume it is lat/lon axis order
                                            isLonLat4326 = false
                                        }

                                        var geomProps = featureTypeProperties.filter(function (prop, idx) {
                                            return prop.type && prop.type.startsWith("gml");
                                        })

                                        // ignore feature types with no gml prop. Correct ?
                                        if (geomProps && geomProps.length > 0) {

                                            if (useGET) {

                                                var gmlFormat = gmlFormatVersion == 'GML2' ? new ol.format.GML2() : new ol.format.GML3();

                                                if (gmlFormatVersion == 'GML2' && isLonLat4326) {

                                                    // force lon/lat parsing when needed
                                                    // WARN this overloading works only with ol-debug lib !
                                                    gmlFormat.readGeometryElement = function (node, objectStack) {
                                                        var context = (objectStack[0]);
                                                        if (node.firstElementChild.getAttribute('srsName') == 'http://www.opengis.net/gml/srs/epsg.xml#4326')
                                                            context['srsName'] = 'EPSG:4326:LONLAT';

                                                        var geometry = ol.xml.pushParseAndPop(null,
                                                            this.GEOMETRY_PARSERS_, node, objectStack, this);
                                                        if (geometry) {
                                                            return ol.format.Feature.transformWithOptions(geometry, false, context);
                                                        } else {
                                                            return undefined;
                                                        }
                                                    };

                                                }

                                                var format = new ol.format.WFS({
                                                    //version: ver,
                                                    url: url,
                                                    projection: isLonLat4326 ? OL_HELPERS.EPSG4326_LONLAT : resolvedSrs,
                                                    // If specifying featureType, it is mandatory to also specify featureNS
                                                    // if not, OL will introspect and find all NS and feature types
                                                    //featureType: candidate.name,
                                                    //featureNS: candidate.featureNS,

                                                    gmlFormat: gmlFormat
                                                })


                                                var ftSource = new ol.source.Vector({
                                                    loader: function (extent, resolution, mapProjection) {

                                                        var bbox;
                                                        if (ver != '1.0.0') {
                                                            // let's set the bbox srs explicitly to avoid default behaviours among server impls

                                                            if (ol.proj.equivalent(mapProjection, OL_HELPERS.EPSG4326)
                                                            // apparently 4326 extents from map.view are always in lon/lat already
                                                            //&& mapProjection.getAxisOrientation() == 'enu'
                                                                ) {
                                                                // the current bbox is expressed in lon/lat --> flip axis
                                                                extent = [extent[1], extent[0], extent[3], extent[2]];

                                                                bbox = extent.join(',') + ',' + OL_HELPERS.EPSG4326_LONG.getCode()
                                                            } else {
                                                                bbox = extent.join(',') + ',' + mapProjection.getCode()
                                                            }
                                                        } else {
                                                            bbox = extent.join(',')
                                                        }

                                                        var params = {
                                                            service: 'WFS',
                                                            version: ver,
                                                            request: 'GetFeature',
                                                            maxFeatures: MAX_FEATURES,
                                                            typename: candidate.name, /* TODO deal with WFS that require the prefix to be included : $candidate.prefixedName*/
                                                            srsname: resolvedSrs.getCode(),
                                                            /* explicit SRS must be provided here, as some impl (geoserver)
                                                             take lat/lon axis order by default.
                                                             EPSG:4326 enforces lon/lat order */
                                                            /* TODO check if map proj is compatible with WFS
                                                             some versions/impls need always 4326 bbox
                                                             do on-the-fly reprojection if needed */
                                                            bbox: bbox,
                                                            // some WFS have wrong axis order if GML3
                                                            outputFormat: gmlFormatVersion
                                                        }

                                                        ftLayer.getSource().setState(ol.source.State.LOADING)

                                                        return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + kvp2string(params),
                                                            {method:'GET', credentials: 'include'}
                                                        ).then(
                                                            function (response) {
                                                                if (!response.ok)
                                                                    throw "GetFeatures failed: "+response.statusText;
                                                                else
                                                                    return response.text();
                                                            }
                                                        ).then(
                                                            function (text) {
                                                                var features = format.readFeatures(text, {featureProjection: mapProjection, dataProjection: resolvedSrs})
                                                                /* This is no longer needed as axis order is forced to lon/lat in format.GML
                                                                 if (!isLatLon && ol.proj.equivalent(resolvedSrs, OL_HELPERS.EPSG4326)) {
                                                                 // OL3+ only supports xy. --> reverse axis order if not native latLon
                                                                 for (var i = 0; i < features.length; i++) {
                                                                 features[i].getGeometry().applyTransform(function (coords, coords2, stride) {
                                                                 for (var j = 0; j < coords.length; j += stride) {
                                                                 var y = coords[j];
                                                                 var x = coords[j + 1];
                                                                 coords[j] = x;
                                                                 coords[j + 1] = y;
                                                                 }
                                                                 });
                                                                 }
                                                                 }
                                                                 */

                                                                // generate fid from properties hash to avoid multiple insertion of same feature
                                                                // (when max_features strategy is applied and features have no intrisic ID)
                                                                features.forEach(function(feature) {
                                                                    if (feature.getId() === undefined) {
                                                                        var hashkey = new ol.format.GeoJSON().writeFeature(feature).hashCode();
                                                                        feature.setId(hashkey);
                                                                    }
                                                                })

                                                                ftLayer
                                                                    .getSource()
                                                                    .addFeatures(features);

                                                                var moreToLoad = features.length >= MAX_FEATURES;
                                                                ftLayer.getSource().set('partial_load', moreToLoad);

                                                                ftLayer.getSource().setState(ol.source.State.READY);
                                                                return moreToLoad;
                                                            }
                                                        ).catch(function (ex) {
                                                                ftLayer.getSource().setState(ol.source.State.ERROR);
                                                                ftLayer.getSource().set("error", ex);
                                                                console.warn("GetFeatures failed on "+ftLayer.getSource().get('name')+": "+ex);
                                                                console.warn(ex);
                                                            })
                                                    },
                                                    strategy: ol.loadingstrategy.bbox,
                                                    projection: resolvedSrs // is this needed ?
                                                    //maxExtent:
                                                })

                                                ftSource.getFeatureById = function(id) {
                                                    var promise = $.Deferred();

                                                    var params = {
                                                        service: 'WFS',
                                                        version: ver,
                                                        request: 'GetFeature',
                                                        typename: candidate.name, /* TODO deal with WFS that require the prefix to be included : $candidate.prefixedName*/
                                                        featureID: id,
                                                        srsname: resolvedSrs.getCode(),
                                                        outputFormat: gmlFormatVersion
                                                    }

                                                    fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + kvp2string(params),
                                                        {method:'GET', credentials: 'include'}
                                                    ).then(
                                                        function (response) {
                                                            if (!response.ok)
                                                                throw "GetFeatures failed: "+response.statusText;
                                                            else
                                                                return response.text();
                                                        }
                                                    ).then(
                                                        function (text) {
                                                            var features = format.readFeatures(text, {featureProjection: map.getView().getProjection(), dataProjection: resolvedSrs})

                                                            // generate fid from properties hash to avoid multiple insertion of same feature
                                                            // (when max_features strategy is applied and features have no intrisic ID)
                                                            features.forEach(function(feature) {
                                                                if (feature.getId() === undefined) {
                                                                    var hashkey = new ol.format.GeoJSON().writeFeature(feature).hashCode();
                                                                    feature.setId(hashkey);
                                                                }
                                                            })

                                                            if (features.length == 1)
                                                                promise.resolve(features[0]);
                                                            else
                                                                promise.reject("Wrong number of features: "+features.length);
                                                        }
                                                    ).catch(function (ex) {
                                                            console.warn("GetFeatureById failed on "+ftLayer.getSource().get('name')+" / "+id+" : "+ex);
                                                            console.warn(ex);
                                                            promise.reject(ex);
                                                        })

                                                    return promise;
                                                }

                                                ftLayer = new ol.layer.Vector({
                                                    style: OL_HELPERS.DEFAULT_STYLEMAP.default,
                                                    title: candidate.title,
                                                    source: ftSource,
                                                    visible: idx == 0 || ftNames != undefined, // if explicit ft list was passed, enable all
                                                });
                                                // override getExtent to take advertised bbox into account first
                                                ftLayer.getSource().set('name', candidate.name);
                                                ftLayer.getSource().set('ftDescr', candidate);
                                                ftLayer.getSource().getFullExtent = getFTSourceExtent;

                                            } else {

                                                /* TODO_OL4 implement POST
                                                 ftLayer = new OpenLayers.Layer.WFSLayer(
                                                 candidate.name, {
                                                 styleMap: defaultStyleMap,
                                                 ftDescr: candidate,
                                                 title: candidate.title,
                                                 strategies: [new OpenLayers.Strategy.BBOXWithMax({maxFeatures: MAX_FEATURES, ratio: 1})],
                                                 projection: resolvedSrs,
                                                 visibility: idx == 0,
                                                 protocol: new OpenLayers.Protocol.WFS({
                                                 //headers: {"Content-Type": "application/xml; charset=UTF-8"}, // (failed) attempt at dealing with accentuated chars in some feature types
                                                 version: ver,
                                                 url: url,
                                                 featureType: candidate.name,
                                                 srsName: resolvedSrs,
                                                 //featurePrefix: descr.targetPrefix,
                                                 featureNS: descr.targetNamespace,
                                                 maxFeatures: MAX_FEATURES,
                                                 formatOptions : {
                                                 xy: !isLatLon
                                                 },
                                                 geometryName: $(geomProps[0]).attr('name'),
                                                 //outputFormat: "GML2"  // enforce GML2, as GML3 uses lat/long axis order and discrepancies may exists between implementations (to be verified)
                                                 })
                                                 })
                                                 */

                                                throw "Not Implemented";
                                            }

                                            layerProcessor && layerProcessor(ftLayer)
                                        }

                                    })
                                }

                                deferredLayer.resolve(ftLayer)
                            } catch (err) {
                                deferredLayer.reject(err)
                            }
                        },
                        function(err) {
                            deferredLayer.reject(err)
                        }
                    )
                })

                $.when.apply($, deferredLayers).then(
                    function() {
                        deferredResult.resolve(Array.from(arguments));
                    },
                    function (err) {
                        deferredResult.reject(err);
                    });

            },
            // failure callback
            function(err) {
                deferredResult.reject(err);
            }
        )

        return deferredResult;
    }




    OL_HELPERS.withWFS3Types = function (proxyUri, layerProcessor, ftNames, map, proxifyFn) {

        if (!Array.isArray(ftNames)) {
            if (typeof ftNames == 'string')
                ftNames = [ftNames];
            else
                ftNames = undefined
        }

        var deferredResult = $.Deferred()

        var openAPIclient = new SwaggerClient(
            proxyUri,
            {
                requestInterceptor: proxifyFn && function (req) {
                    req.url = proxifyFn(req.url);
                    return req;
                },
                responseInterceptor: function (resp) {
                    if (resp.body && !resp.body.servers) {
                        // hack to deal with servers not returning servers block
                        var serverUrl = decodeURIComponent(OL_HELPERS.parseURL(proxyUri).query._uri);
                        var apiIdx = serverUrl.indexOf("/api");
                        serverUrl = serverUrl.substring(0, apiIdx);
                        resp.body.servers = [
                            {
                                url: serverUrl
                            }
                        ]
                    }
                    return resp;
                }
            })
            .then(
            function (openAPIclient) {
                //openAPIclient.apis.server.get_collections({f: 'json'})
                var collectionsGetter =
                    (openAPIclient.apis.Capabilities && openAPIclient.apis.Capabilities.describeCollections) ||
                    (openAPIclient.apis.Collections && openAPIclient.apis.Collections.describeCollections) ||
                    (openAPIclient.apis.FeatureSets && openAPIclient.apis.FeatureSets.describeCollections) ||
                    (openAPIclient.apis.server && openAPIclient.apis.server.get_collections);
                collectionsGetter({f: 'json'}).then(
                    function (capas) {


                        var candidates = capas.obj.collections
                        if (ftNames) candidates = capas.featureTypes.filter(function (ft) {
                            return ftNames.indexOf(ft.name) >= 0
                        })

                        var deferredLayers = []

                        candidates.forEach(function (candidate, idx) {
                            if (!candidate.name)
                                candidate.name = candidate.collectionId;

                            var deferredLayer = $.Deferred();
                            deferredLayers.push(deferredLayer);

                            var geojsonFormat = new ol.format.GeoJSON({
                                // avoid collision with potential geojson properties named 'geometry'
                                // cf https://stackoverflow.com/questions/32746143/geojson-with-a-geometry-property-in-ol3
                                geometryName: OL_HELPERS.FEATURE_GEOM_PROP,
                                defaultDataProjection: OL_HELPERS.EPSG4326
                            });

                            var ftSource = new ol.source.Vector({
                                loader: function (extent, resolution, mapProjection) {

                                    var bbox4326 = ol.proj.transformExtent(extent, mapProjection, OL_HELPERS.EPSG4326)

                                    var params = {
                                        f: 'json',
                                        limit: MAX_FEATURES,
                                        bbox: bbox4326.join(','),
                                        collectionId: candidate.name
                                    }

                                    this.setState(ol.source.State.LOADING);
                                    var path =
                                        openAPIclient.spec.paths['/' + candidate.name] ||
                                        openAPIclient.spec.paths['/collections/{collectionId}/items'] ||
                                        openAPIclient.spec.paths['/collections/' + candidate.name + '/items'];
                                    var getOpName = path.get.operationId;
                                    var operation = openAPIclient.apis.Features[getOpName]
                                    return operation(params).then(
                                        function (result) {
                                            if (result.parseError) {
                                                throw "Parse Error: " + result.parseError.message;
                                            }
                                            // make sure we have IDs for every feature
                                            result.obj.features.forEach(function (jsonFeature) {
                                                if (jsonFeature.id === undefined) {
                                                    jsonFeature.id = jsonFeature.ID || (jsonFeature.properties && jsonFeature.properties.gmlid)
                                                    if (! jsonFeature.id) {
                                                        // generate fid from properties hash to avoid multiple insertion of same feature
                                                        // (when max_features strategy is applied and features have no intrisic ID)
                                                        var hashkey = JSON.stringify(jsonFeature).hashCode();
                                                        jsonFeature.id = hashkey;
                                                    }
                                                }
                                            })

                                            var features = geojsonFormat.readFeatures(
                                                    result.obj || [], // content is undefined when no result (?!)
                                                {featureProjection: mapProjection,
                                                    dataProjection: OL_HELPERS.EPSG4326})

                                            ftLayer
                                                .getSource()
                                                .addFeatures(features);

                                            var moreToLoad = features.length >= MAX_FEATURES;
                                            ftLayer.getSource().set('partial_load', moreToLoad);
                                            ftLayer.getSource().setState(ol.source.State.READY);

                                            return moreToLoad
                                        }
                                    ).catch(function (ex) {
                                            ftLayer.getSource().setState(ol.source.State.ERROR);
                                            ftLayer.getSource().set("error", ex);
                                            console.warn("GetFeatures failed on " + ftLayer.getSource().get('name') + ": " + ex);
                                        })
                                },
                                strategy: ol.loadingstrategy.bbox
                            })

                            ftSource.getFeatureById = function (id) {
                                // try both the 'Features' and 'Feature' tags. Not sure which one is correct, check the spec.
                                var featuresApi = openAPIclient.apis.Features || openAPIclient.apis.Feature;
                                var path =
                                    openAPIclient.spec.paths['/' + candidate.name+ '/{id}'] ||
                                    openAPIclient.spec.paths['/collections/{collectionId}/items/{featureId}'] ||
                                    openAPIclient.spec.paths['/collections/' + candidate.name + '/items/{featureId}'];
                                var getFeatureByIdOpName = path ? path.get.operationId : 'getFeature';
                                var getFeatureOp = featuresApi[getFeatureByIdOpName];
                                var promise = $.Deferred();
                                // in doubt, try to use collectionId, featureId, id
                                getFeatureOp({collectionId: candidate.name, featureId: id, id: id, f: 'json'}).then(
                                    function (result) {
                                        if (result.parseError) {
                                            throw "Parse Error: " + result.parseError.message;
                                        }

                                        if (!result.obj.type == 'FeatureCollection' || result.obj.features) {
                                            if (!result.obj.features)
                                                throw "Results advertised as FeatureCollection, but not containing a 'features' array"
                                            result.obj = result.obj.features[0];
                                        }

                                        // make sure we have IDs for every feature
                                        if (result.obj.id === undefined && result.obj.ID)
                                            result.obj.id = result.obj.ID;

                                        var features = geojsonFormat.readFeatures(
                                                result.obj || [], // content is undefined when no result (?!)
                                            {featureProjection: map.getView().getProjection(),
                                                dataProjection: OL_HELPERS.EPSG4326})

                                        promise.resolve(features.length > 0 && features[0]);
                                    }
                                ).catch(function (ex) {
                                        console.warn("GetFeatureById failed on " + ftLayer.getSource().get('name') + " / " + id + " : " + ex);
                                        promise.reject(ex);
                                    })

                                return promise;
                            }

                            var ftLayer = new ol.layer.Vector({
                                style: OL_HELPERS.DEFAULT_STYLEMAP.default,
                                title: candidate.title || candidate.name,
                                source: ftSource,
                                visible: idx == 0 || ftNames != undefined
                            });
                            // override getExtent to take advertised bbox into account first
                            ftLayer.getSource().set('name', candidate.name);
                            ftLayer.getSource().set('ftDescr', candidate);
                            ftLayer.getSource().getFullExtent = getFT3SourceExtent;

                            layerProcessor && layerProcessor(ftLayer);

                            deferredLayer.resolve(ftLayer);
                        })

                        $.when.apply($, deferredLayers).then(
                            function () {
                                deferredResult.resolve(Array.from(arguments));
                            },
                            function (err) {
                                deferredResult.reject(err);
                            });

                    },
                    // failure callback
                    function (err) {
                        deferredResult.reject(err);
                    }
                )
            }).catch(function (err) {
                deferredResult.reject(err);
            })

        return deferredResult;
    }




    OL_HELPERS.withWMSLayers = function (capaUrl, getMapUrl, layerProcessor, layerNames, useTiling, map) {

        var deferredResult = $.Deferred()

        capaUrl = OL_HELPERS.cleanOGCUrl(capaUrl)
        getMapUrl = OL_HELPERS.cleanOGCUrl(getMapUrl)

        if (!Array.isArray(layerNames)) {
            if (typeof layerNames == 'string')
                layerNames = [layerNames];
            else
                layerNames = undefined
        }

        // remove namespaces from layer names
        // name coming from ISO md is sometimes namespaced, while actual layer ID is not
        layerNames && (layerNames = layerNames.map(unnamespace));

        parseWMSCapas(
            capaUrl,
            undefined, /* version */
            function (capas) {

                var ver = capas.version

                var deferredLayers = []

                var isFirst = true;
                var processLayerCandidate = function (candidate) {

                    if (candidate.Name &&
                        (!layerNames ||
                            layerNames.indexOf(unnamespace(candidate.Name)) >= 0)
                        ) {
                        var deferredLayer = $.Deferred()
                        deferredLayers.push(deferredLayer)

                        try {
                            var mapLayer;
                            if (useTiling) {
                                mapLayer = new ol.layer.Tile({
                                    title: candidate.Title || candidate.Name,
                                    visible: isFirst || layerNames != undefined, // if explicit layer list was passed, enable all
                                    //extent: ,
                                    source: new ol.source.TileWMS({
                                        url: getMapUrl,
                                        params: {LAYERS: candidate.Name,
                                            TRANSPARENT: true,
                                            VERSION: ver,
                                            EXCEPTIONS: "INIMAGE"}
                                    })
                                })
                            } else {
                                mapLayer = new ol.layer.Image({
                                    title: candidate.Name,
                                    visible: isFirst || layerNames!= undefined, // if explicit layer list was passed, enable all,
                                    //extent: ,
                                    source: new ol.source.ImageWMS({
                                        url: getMapUrl,
                                        params: {LAYERS: candidate.Name,
                                            TRANSPARENT: true,
                                            VERSION: ver,
                                            EXCEPTIONS: "INIMAGE"},
                                        ratio: 1
                                    })
                                })
                            }
                            isFirst = false;

                            mapLayer.getSource().set('name', candidate.Name);
                            mapLayer.getSource().set('mlDescr', candidate);
                            mapLayer.getSource().getFullExtent = getWMSSourceExtent;

                            layerProcessor && layerProcessor(mapLayer)

                            deferredLayer.resolve(mapLayer)
                        } catch (err) {
                            deferredLayer.reject(err)
                        }
                    } else if (candidate.Layer) {
                        // layer contains nested layers

                        //TODO create layer groups in switcher

                        $_.each(candidate.Layer, processLayerCandidate)
                    }

                }

                $_.each(capas.Capability.Layer.Layer, processLayerCandidate)

                $.when.apply($, deferredLayers).then(
                    function() {
                        deferredResult.resolve(Array.from(arguments));
                    },
                    function(err) {
                        deferredResult.reject(err);
                    }
                );
            },
            // failure callback
            function(err) {
                deferredResult.reject(err);
            }
        )

        return deferredResult;

    }


    OL_HELPERS.withWMTSLayers = function (capaUrl, layerProcessor, layerNames, projection, resolutions, matrixSet) {

        var deferredResult = $.Deferred()

        capaUrl = OL_HELPERS.cleanOGCUrl(capaUrl)

        if (!Array.isArray(layerNames)) {
            if (typeof layerNames == 'string')
                layerNames = [layerNames];
            else
                layerNames = undefined
        }

        OL_HELPERS.parseWMTSCapas(
            capaUrl,
            function (capas) {

                // make sure TileMatrix ids are not prefixed with TileMatrixSet ids
                capas.Contents.Layer.forEach(function(l) {
                    l.TileMatrixSetLink.forEach(function(tmslk) {
                        tmslk.TileMatrixSetLimits && tmslk.TileMatrixSetLimits.forEach(function(tmslmts) {
                            if (tmslmts.TileMatrix.startsWith(tmslk.TileMatrixSet+':')) {
                                tmslmts.TileMatrix = tmslmts.TileMatrix.substring(tmslk.TileMatrixSet.length+1);
                            }
                        })
                    })
                });

                var candidates = capas['Contents']['Layer']
                if (layerNames) candidates = candidates.filter(function (layer) {
                    return layerNames.indexOf(layer['Identifier']) >= 0
                })

                var ver = capas.version

                var deferredLayers = []

                $_.each(candidates, function (candidate, idx) {
                    var deferredLayer = $.Deferred()
                    deferredLayers.push(deferredLayer)

                    try {
                        var params = {
                            layer: candidate['Identifier']
                        };
                        // WMTS.optionsFromCapabilities does not accept undefined projection value in its params
                        if (projection)
                            params.projection = projection
                        else if (matrixSet)
                            params.matrixSet = matrixSet

                        var options = ol.source.WMTS.optionsFromCapabilities(capas, params);

                        var mapLayer = new ol.layer.Tile({
                            title: candidate['Title'],
                            visible: idx == 0 || layerNames != undefined, // if explicit layer list was passed, enable all,
                            source: new ol.source.WMTS(options)
                        })

                        if (candidate.Dimension && candidate.Dimension.length > 0) {
                            var urlTemplate = candidate['ResourceURL'] && candidate['ResourceURL'].length > 0 && candidate['ResourceURL'][0].template;
                            var urlParams = urlTemplate && urlTemplate.match(/\{(\w+?)\}/g);

                            var dimensions = {};
                            for (var idx = 0; idx < candidate.Dimension.length; idx++) {
                                var dim = candidate.Dimension[idx];
                                var id = dim['Identifier'];
                                // look for a case insensitive match (OL is case sensitive in that respect, some capabilities not)
                                for (var idx in urlParams) {
                                    var paramName = urlParams[idx].substring(1, urlParams[idx].length - 1);
                                    if (paramName.toLowerCase() == id) {
                                        id = paramName;
                                        break;
                                    }
                                }
                                dimensions[id] = dim['Default']
                            }
                            mapLayer.getSource().updateDimensions(dimensions);
                        }

                        mapLayer.getSource().set('name', candidate.Identifier);
                        mapLayer.getSource().set('mlDescr', candidate);
                        mapLayer.getSource().getFullExtent = getWMTSSourceExtent;

                        layerProcessor && layerProcessor(mapLayer)

                        deferredLayer.resolve(mapLayer)
                    } catch (err) {
                        deferredLayer.reject(err)
                    }
                })

                $.when.apply($, deferredLayers).then(
                    function () {
                        deferredResult.resolve(Array.from(arguments));
                    },
                    function (err) {
                        deferredResult.reject(err);
                    }
                );

            },
            // failure callback
            function(err) {
                deferredResult.reject(err);
            }
        )

        return deferredResult;

    }



    OL_HELPERS.createGeoJSONLayer = function (url) {

        var geojsonFormat = new ol.format.GeoJSON({
            // avoid collision with potential geojson properties named 'geometry'
            // cf https://stackoverflow.com/questions/32746143/geojson-with-a-geometry-property-in-ol3
            geometryName: OL_HELPERS.FEATURE_GEOM_PROP,
            defaultDataProjection: OL_HELPERS.EPSG4326
        });

        var success = function(features, dataProjection) {
            geojson.getSource().addFeatures(features);
            // set source as ready once features are loaded
            geojson.getSource().set('waitingOnFirstData', false)
            geojson.getSource().setState(ol.source.State.READY);
        }

        // use a custom loader to set source state
        var geojsonLoader =
            function(extent, resolution, projection) {

                $.ajax({url: geojson.getSource().url, dataType: 'json', success: function(response) {
                    if (!response || response.error) {
                        //TODO
                    } else {
                        var source = response

                        if (response.links) {
                            var nextLink = response.links.find(function(link) {return link.rel == 'next' });
                            if (nextLink && nextLink.href) {
                                geojson.getSource().set('partial_load', true);
                                geojson.getSource().set('next_page', nextLink.href);
                            }
                        }

                        var features = geojsonFormat.readFeatures(source,
                            {featureProjection: projection})
                        var sourceProjection = geojsonFormat.readProjection(source)
                        success.call(this, features, sourceProjection);
                    }
                }});
            }

        var geojson = new ol.layer.Vector({
            style: OL_HELPERS.DEFAULT_STYLEMAP.default,
            title: 'GeoJSON',
            source: new ol.source.Vector({
                loader: function(extent, resolution, projection) {
                    // set source as loading before reading the GeoJSON
                    this.setState(ol.source.State.LOADING);
                    return geojsonLoader.call(this, extent, resolution, projection)
                },
                format: geojsonFormat
            })
        });
        geojson.getSource().url = url;
        geojson.getSource().nextPage = function() {
            if (this.get('next_page')) {
                this.url = this.get('next_page');
                //TODO must find a way to append features
                geojson.getSource().clear();
            }
        };


        geojson.getSource().set('waitingOnFirstData', true);

        return geojson;
    }

    /* TODO_OL4 */
    OL_HELPERS.createEsriGeoJSONLayer = function (url) {

        var esrijson = new OpenLayers.Layer.Vector(
            "Esri GeoJSON",
            {
                style: OL_HELPERS.DEFAULT_STYLEMAP.default,
                projection: EPSG4326,
                strategies: [new OpenLayers.Strategy.Fixed()],
                style: default_style,
                protocol: new OpenLayers.Protocol.Script({
                    url: url, //ArcGIS Server REST GeoJSON output url
                    format: new OpenLayers.Format.EsriGeoJSON(),
                    parseFeatures: function (data) {
                        return this.format.read(data);
                    }
                })
            });

        return esrijson
    }

    OL_HELPERS.withGeoPackageLayers = function (url, layerProcessor, layerNames, map) {

        if (!Array.isArray(layerNames)) {
            if (typeof layerNames == 'string')
                layerNames = [layerNames];
            else
                layerNames = undefined
        }

        var deferredResult = $.Deferred()

        var deferredLayers = []

        //TODO filter on layerNames

        parseGeoPackage(
            url,
            function (geoPackage) {

                var first = true;
                async.parallel([
                    function(callback) {
                        geoPackage.getTileTables(function(err, tables) {
                            async.eachSeries(tables, function(table, callback) {
                                geoPackage.getTileDaoWithTableName(table, function(err, tileDao) {
                                    geoPackage.getInfoForTable(tileDao, function(err, info) {
                                        var deferredLayer = $.Deferred();
                                        deferredLayers.push(deferredLayer);
                                        var newLayer = OL_HELPERS.createGeoPackageTileLayer(geoPackage, info, tileDao, first, map)
                                        first = false;
                                        layerProcessor && layerProcessor(newLayer);

                                        //TODO deal with err

                                        deferredLayer.resolve(newLayer);

                                        callback();
                                    });
                                });
                            }, callback);
                        });
                    }, function(callback) {
                        geoPackage.getFeatureTables(function(err, tables) {
                            async.eachSeries(tables, function(table, callback) {
                                geoPackage.getFeatureDaoWithTableName(table, function(err, featureDao) {
                                    geoPackage.getInfoForTable(featureDao, function(err, info) {
                                        var deferredLayer = $.Deferred();
                                        deferredLayers.push(deferredLayer);
                                        var newLayer = OL_HELPERS.createGeoPackageFeatureLayer(geoPackage, info, first, map);
                                        first = false;
                                        layerProcessor && layerProcessor(newLayer);

                                        //TODO deal with err

                                        deferredLayer.resolve(newLayer);
                                        callback();
                                    });
                                });
                            }, callback);
                        });
                    }
                ], function () {
                    $.when.apply($, deferredLayers).then(
                        function () {
                            deferredResult.resolve(Array.from(arguments));
                        },
                        function (err) {
                            deferredResult.reject(err);
                        }
                    );
                });

            }
        )
        //TODO catch and reject

        return deferredResult
    }

    OL_HELPERS.withArcGisLayers = function (url, layerProcessor, layerNames, proxifyFn, map) {

        var deferredResult = $.Deferred()

        var deferredLayers = []

        if (!Array.isArray(layerNames)) {
            if (typeof layerNames == 'string')
                layerNames = [layerNames];
            else
                layerNames = undefined
        }

        //TODO filter on layerNames

        proxifyFn = proxifyFn || function(url) {return url;}

        parseArcGisDescriptor(
            proxifyFn(url),
            function (descriptor) {

                if (descriptor.type == "Feature Layer") {
                    var deferredLayer = $.Deferred();
                    deferredLayers.push(deferredLayer);
                    var queryUrl = proxifyFn(url + "/query");
                    var newLayer = OL_HELPERS.createArcgisFeatureLayer(queryUrl, descriptor, true, map)
                    layerProcessor && layerProcessor(newLayer);

                    deferredLayer.resolve(newLayer);
                } else if (descriptor.type == "Group Layer") {
                    // TODO intermediate layer
                } else if (!descriptor.type && descriptor.layers) {
                    var isFirst = true
                    $_.each(descriptor.layers, function (layer, idx) {
                        if (!layer.subLayerIds) {
                            // if layer has no extent defined, copy it from global descriptor
                            if (!layer.bounds && !layer.extent) {
                                layer.extent = descriptor.initialExtent || descriptor.fullExtent;
                            }

                            var deferredLayer = $.Deferred();
                            deferredLayers.push(deferredLayer);
                            var queryUrl = proxifyFn(url + "/" + layer.id + "/query");
                            var newLayer = OL_HELPERS.createArcgisFeatureLayer(queryUrl, layer, isFirst, map);
                            layerProcessor && layerProcessor(newLayer);
                            isFirst = false;
                            deferredLayer.resolve(newLayer);
                        }
                    })
                }

                $.when.apply($, deferredLayers).then(
                    function() {
                        deferredResult.resolve(Array.from(arguments));
                    },
                    function (err) {
                        deferredResult.reject(err);
                    });

            }
        )
        //TODO catch and reject

        return deferredResult
    }

    OL_HELPERS.parseArcgisExtent = function(extentObj, targetSrs) {

        targetSrs = targetSrs || 'EPSG:4326';

        var ext = [
            extentObj.xmin,
            extentObj.ymin,
            extentObj.xmax,
            extentObj.ymax
        ];
        // take advertised srs; 4326 if none
        var srs = 'EPSG:'+ (extentObj.spatialReference ? extentObj.spatialReference.wkid : 4326);

        return ol.proj.transformExtent(ext, ol.proj.get(srs), ol.proj.get(targetSrs));
    }

    OL_HELPERS.createArcgisFeatureLayer = function (url, descriptor, visible, map) {

        var format = new ol.format.EsriJSON();

        var defaultQueryParams = {
            "dummy" : 1,
            "geometryType" : "esriGeometryEnvelope",
            "inSR" : "4326",
            "spatialRel" : "esriSpatialRelIntersects",
            "outFields" : "*",
            "outSR" : "4326",
            "returnGeometry" : true,
            "returnIdsOnly" : false,
            "returnCountOnly" : false,
            "returnZ" : false,
            "returnM" : false,
            "returnDistinctValues" : false,
            "f" : "pjson"
        }

        var layer = new ol.layer.Vector({
            style: OL_HELPERS.DEFAULT_STYLEMAP.default,
            title: descriptor.name,
            source: new ol.source.Vector({
                loader: function (extent, resolution, mapProjection) {
                    var outSrs = OL_HELPERS.EPSG4326;

                    var queryParams = _.extend(
                        {},
                        defaultQueryParams,
                        {
                            "geometry" : extent.join(','),
                            "inSR" : mapProjection.getCode().split(':').pop(),
                            "outSR" : outSrs.getCode().split(':').pop()
                        }
                    )

                    layer.getSource().setState(ol.source.State.LOADING)

                    return fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + kvp2string(queryParams),
                        {method:'GET', credentials: 'include'}
                    ).then(
                        function (response) {
                            return response.text();
                        }
                    ).then(
                        function (text) {

                            var features = format.readFeatures(text, {featureProjection: mapProjection, dataProjection: outSrs});

                            // generate fid from properties hash to avoid multiple insertion of same feature
                            // (when max_features strategy is applied and features have no intrisic ID)
                            features.forEach(function(feature) {
                                if (feature.getId() === undefined) {
                                    if (feature.get("OBJECTID"))
                                        feature.setId(feature.get("OBJECTID"));
                                    else {
                                        var hashkey = new ol.format.GeoJSON().writeFeature(feature).hashCode();
                                        feature.setId(hashkey);
                                    }
                                }
                            })

                            layer
                                .getSource()
                                .addFeatures(features);

                            var moreToLoad = features.length >= MAX_FEATURES;
                            layer.getSource().set('partial_load', moreToLoad);
                            layer.getSource().setState(ol.source.State.READY);

                            return moreToLoad
                        }
                    ).catch(function (ex) {
                            layer.getSource().setState(ol.source.State.ERROR);
                            console.warn("ArcGIS GetFeatures failed");
                            console.warn(ex);
                        })
                },
                strategy: ol.loadingstrategy.bbox
            }),
            visible : visible
        });


        layer.getSource().getFeatureById = function(id) {


            var outSrs = OL_HELPERS.EPSG4326;

            var queryParams = _.extend(
                {},
                defaultQueryParams,
                {
                    "objectIds" : [id],
                    "inSR" : map.getView().getProjection().getCode().split(':').pop(),
                    "outSR" : outSrs.getCode().split(':').pop()
                }
            )

            var promise = $.Deferred();


            fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + kvp2string(queryParams),
                {method:'GET', credentials: 'include'}
            ).then(
                function (response) {
                    return response.text();
                }
            ).then(
                function (text) {

                    var features = format.readFeatures(text, {featureProjection: map.getView().getProjection(),
                        dataProjection: OL_HELPERS.EPSG4326});

                    // generate fid from properties hash to avoid multiple insertion of same feature
                    // (when max_features strategy is applied and features have no intrisic ID)
                    features.forEach(function(feature) {
                        if (feature.get("OBJECTID"))
                            feature.setId(feature.get("OBJECTID"));
                        else {
                            var hashkey = new ol.format.GeoJSON().writeFeature(feature).hashCode();
                            feature.setId(hashkey);
                        }
                    })

                    promise.resolve(features.length>0 && features[0]);
                }
            ).catch(function (ex) {
                    console.warn("GetFeatureById failed on "+layer.getSource().get('name')+" / "+id+" : "+ex);
                    console.warn(ex);
                    promise.reject(ex);
                })

            return promise;
        }


        if (!descriptor.bounds && descriptor.extent) {
            descriptor.bounds = OL_HELPERS.parseArcgisExtent (descriptor.extent);
        }

        layer.getSource().set('name', descriptor.name);
        layer.getSource().set('arcgisDescr', descriptor);
        // override getExtent to take advertised bbox into account first
        layer.getSource().getFullExtent = getArcGISVectorExtent;

        return layer;
    }

    OL_HELPERS.createGeoPackageTileLayer = function (geoPackage, tableInfo, tileDao, visible, map) {
        // get tileMatrixSet
        var tms = tileDao.tileMatrixSet;


        // create tile grid
        var tileGrid = ol.tilegrid.createXYZ({
            // always use WorldBBOX in 3857 to expose geopackage tiles
            extent: OL_HELPERS.WORLD_BBOX_MERCATOR, //[tms.min_x, tms.min_y, tms.max_x, tms.max_y], // extent of geopackage content
            maxZoom: tileDao.maxZoom,
            minZoom: tileDao.minZoom,
            tileSize: [256, 256 /* tm.tile_width, tm.tile_height*/] // tile size in pixels
        });
        var gpr = new geopackage.GeoPackageTileRetriever(tileDao, 256, 256);

        var geopackageTileLayer = new ol.layer.Tile({
            title: tableInfo.tableName,
            visible: visible,
            source: new ol.source.XYZ({
                projection: OL_HELPERS.Mercator, //tileDao.projection,
                tileUrlFunction: function(tileCoord) {
                    // create a simplified url for use in the tileLoadFunction
                    return tileCoord.toString();
                },
                tileLoadFunction: function(tile, url) {
                    var zoom = map.getView().getZoom();

                    if (zoom < tileDao.minZoom || zoom > tileDao.maxZoom) {
                        console.log('No tiles exist in the GeoPackage for the current bounds and zoom level ('+zoom+'). Min zoom: ' + tileDao.minZoom + ' Max Zoom: ' + tileDao.maxZoom);
                        tile.getImage().src = '';
                        return;
                    }

                    var tileCoord = url.split(',');

                    var tileX = parseInt(tileCoord[1]);
                    var tileY = - parseInt(tileCoord[2]) - 1;
                    var tileZ = parseInt(tileCoord[0]);

                    gpr.getTile(tileX, tileY, tileZ, function(err, tileBase64DataURL) {
                        tile.getImage().src = tileBase64DataURL;
                    });
                },
                tileGrid : tileGrid
            })
        });

        return geopackageTileLayer;
    }

    OL_HELPERS.createGeoPackageFeatureLayer = function (geoPackage, gpFeatureTableInfo, visible, map) {

        var geojsonFormat = new ol.format.GeoJSON({
            // avoid collision with potential geojson properties named 'geometry'
            // cf https://stackoverflow.com/questions/32746143/geojson-with-a-geometry-property-in-ol3
            geometryName: OL_HELPERS.FEATURE_GEOM_PROP,
            defaultDataProjection: OL_HELPERS.EPSG4326
        });


        // use a custom loader to set source state
        var geopackageLoader =
            function(extent, resolution, projection) {

                var features = [];
                geopackage.iterateGeoJSONFeaturesFromTable(
                    geoPackage,
                    gpFeatureTableInfo.tableName,
                    /* feature callback */
                    function(err, geoJson, done) {


                        if (err) {
                            layer.getSource().setState(ol.source.State.ERROR);
                            console.warn("Geopackage readFeatures failed: "+err);
                            return;
                        }

                        //TODO source projection?

                        // generate fid from properties hash to avoid multiple insertion of same feature
                        // (when max_features strategy is applied and features have no intrisic ID)
                        /*
                         features.forEach(function(feature) {
                         if (feature.getId() === undefined) {
                         if (feature.get("OBJECTID"))
                         feature.setId(feature.get("OBJECTID"));
                         else {
                         var hashkey = new ol.format.GeoJSON().writeFeature(feature).hashCode();
                         feature.setId(hashkey);
                         }
                         }
                         })
                         */

                        var feature = geojsonFormat.readFeature(geoJson, {featureProjection: projection});
                        features.push(feature);

                        async.setImmediate(function(){
                            done();
                        });
                    },
                    function() {
                        geopackageLayer.getSource().addFeatures(features);

                        // set source as ready once features are loaded
                        geopackageLayer.getSource().set('waitingOnFirstData', false)
                        geopackageLayer.getSource().setState(ol.source.State.READY);
                    }
                );
            }

        var geopackageLayer = new ol.layer.Vector({
            style: OL_HELPERS.DEFAULT_STYLEMAP.default,
            title: gpFeatureTableInfo.tableName,
            visible: visible,
            source: new ol.source.Vector({
                loader: function(extent, resolution, projection) {
                    // set source as loading before reading the GeoJSON
                    this.setState(ol.source.State.LOADING);
                    return geopackageLoader.call(this, extent, resolution, projection)
                }
            })
        });

        geopackageLayer.getSource().getFeatureById = function(id) {
            var promise = $.Deferred();

            throw "not implemented";

            return promise;
        }

        geopackageLayer.getSource().set('name', gpFeatureTableInfo.tableName);
        // override getExtent to take advertised bbox into account first
        /*
         geopackageLayer.getSource().getFullExtent = function() {
         throw "not implemented";
         };
         */

        return geopackageLayer;
    }



    OL_HELPERS.createLayerFromConfig = function(mapConfig, isBaseLayer) {
        var urls;
        var attribution;

        var deferredResult = $.Deferred()

        try {
            if (!mapConfig.type) {
                urls = 'http://tile.openstreetmap.org/{z}/{x}/{y}.png';
                var baseMapLayer = new ol.layer.Tile(
                    {title: 'OSM',
                        type: isBaseLayer ? 'base' : undefined, // necessary for ol3-layerswitcher
                        source: new ol.source.OSM({
                            url: urls,
                            attributions: 'Map tiles & Data by OpenStreetMap, under CC BY SA.'
                        })
                    });

                deferredResult.resolve([baseMapLayer]);
            } else if (mapConfig.type.toLowerCase() == 'osm') {
                urls = mapConfig['url'];

                var baseMapLayer = new ol.layer.Tile(
                    {title: mapConfig['title'] || 'OSM',
                        type: isBaseLayer ? 'base' : undefined, // necessary for ol3-layerswitcher
                        source: new ol.source.OSM({
                            url: urls,
                            attributions: mapConfig.attribution
                        })
                    });

                deferredResult.resolve([baseMapLayer]);

            } else if (mapConfig.type.toLowerCase() == 'stamen') {
                var layer = mapConfig['layer'] || 'watercolor';
                var baseMapLayer = new ol.layer.Tile({
                    title: mapConfig['title'] || 'stamen',
                    type: isBaseLayer ? 'base' : undefined, // necessary for ol3-layerswitcher
                    source: new ol.source.Stamen({
                        layer: layer,
                        attributions: 'Map tiles by <a href="http://stamen.com">Stamen Design</a> (<a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>). Data by <a href="http://openstreetmap.org">OpenStreetMap</a> (<a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>)'
                    })
                });

                deferredResult.resolve([baseMapLayer]);

            } else if (mapConfig.type == 'tms') {

                urls = mapConfig['url'];
                if (!urls)
                    throw 'TMS URL must be set when using TMS Map type';
                var projection = mapConfig['srs'] ? ol.proj.get(mapConfig['srs']) : OL_HELPERS.Mercator
                var extent = mapConfig['extent'] && eval(mapConfig['extent'])

                var resolutions = mapConfig['resolutions'] && eval(mapConfig['resolutions'])

                var tileGrid = resolutions && new ol.tilegrid.TileGrid({
                    extent: extent,
                    resolutions: resolutions,
                    //origin: [extent[0], extent[1]],
                    tileSize: [256, 256]
                });

                var layerName = mapConfig['layername'];
                var baseMapLayer = new ol.layer.Tile({
                    title: mapConfig['title'],
                    type: isBaseLayer ? 'base' : undefined,
                    extent: extent,
                    source: new ol.source.XYZ({
                        projection: projection,
                        tileGrid: tileGrid,
                        //tilePixelRatio: tilePixelRatio,
                        url: urls + '/1.0.0/' + layerName + '/{z}/{x}/{-y}.png'
                    })
                });

                deferredResult.resolve([baseMapLayer]);
            } else if (mapConfig.type == 'XYZ') {
                // Custom XYZ layer
                urls = mapConfig['url'];
                if (!urls)
                    throw 'URL must be set when using XYZ type';

                var baseMapLayer = new ol.layer.Tile(
                    {
                        title: mapConfig['title'],
                        type: isBaseLayer ? 'base' : undefined, // necessary for ol3-layerswitcher
                        source: new ol.source.XYZ({
                            url: urls,
                            /* TODO
                             attribution: mapConfig.attribution
                             */
                        })
                    });

                deferredResult.resolve([baseMapLayer]);
            } else if (mapConfig.type == 'wmts') {

                var layerCallback = function (layer, title_suffix) {
                    layer.set('type', 'base');
                    mapConfig['dimensions'] && layer.getSource().updateDimensions(mapConfig['dimensions']);
                    mapConfig['title'] && layer.set('title', mapConfig['title'] + (title_suffix ? (' ' + title_suffix) : ''));
                    /* TODO
                     layer.options.attribution = mapConfig.attribution
                     */
                };

                return OL_HELPERS.withWMTSLayers(
                    mapConfig['url'],
                    undefined, //layerCallback,
                    mapConfig['layer'],
                    mapConfig['srs'],
                        mapConfig['resolutions'] && eval(mapConfig['resolutions']),
                    mapConfig['matrixSet']
                ).then(function (layers) {
                        if (layers.length <= 1)
                            layers.forEach(layerCallback);
                        else {
                            layers.forEach(function (layer) {
                                layerCallback(layer, layer.get('title'))
                            });
                        }

                        return layers;
                    })

            } else if (mapConfig.type == 'wms') {
                urls = mapConfig['url'];
                if (!urls)
                    throw 'WMS URL must be set when using WMS Map type';

                var useTiling = mapConfig['useTiling'] === undefined || mapConfig['useTiling']


                var baseMapLayer;

                if (useTiling) {
                    baseMapLayer = new ol.layer.Tile({
                        type: isBaseLayer ? 'base' : undefined,
                        title: mapConfig['layer'],
                        visible: true,
                        extent: mapConfig['extent'] && eval(mapConfig['extent']), /* TODO_OL4 this correct to set maxExtent ? */
                        source: new ol.source.TileWMS({
                            url: urls,
                            params: {layers: mapConfig['layer'],
                                TRANSPARENT: false,
                                EXCEPTIONS: "INIMAGE"},
                            projection: mapConfig['srs'] ? ol.proj.get(mapConfig['srs']) : OL_HELPERS.EPSG4326
                        })
                    })
                } else {
                    baseMapLayer = new ol.layer.Image({
                        type: isBaseLayer ? 'base' : undefined,
                        title: mapConfig['layer'],
                        visible: true,
                        extent: mapConfig['extent'] && eval(mapConfig['extent']), /* TODO_OL4 this correct to set maxExtent ? */
                        source: new ol.source.ImageWMS({
                            url: urls,
                            params: {LAYERS: mapConfig['layer'],
                                TRANSPARENT: false,
                                EXCEPTIONS: "INIMAGE"},
                            ratio: 1,
                            projection: mapConfig['srs'] ? ol.proj.get(mapConfig['srs']) : OL_HELPERS.EPSG4326,
                        })
                    })
                }
                deferredResult.resolve([baseMapLayer]);

            } else {
                throw "Unknown basemap type: " + mapConfig.type;
            }
        } catch (err) {
            deferredResult.reject(err);
        }

        return deferredResult;

    }


    OL_HELPERS.SUPPORTED_MIME_TYPES = {
        'kml': 'application/vnd.google-earth.kml+xml',
        'gml': 'application/gml+xml',
        'wms': 'application/vnd.ogc.wms_xml',
        'wfs': 'application/vnd.ogc.wfs_xml',
        'wfs3': 'application/vnd.ogc.wfs3',
        'gpkg': 'application/vnd.opengeospatial.geopackage+sqlite3',
        'wmts': 'service/wmts',
        'arcgis_rest': 'application/vnd.esri.arcgis.rest',
        'geojson' : 'application/geo+json',
        'json' : 'application/json'
    };

    /**
     * Adds layers from a URL to a map
     * @param map map to add layers to
     * @param url url of the layer(s) resource
     * @param mimetype mime type of the URL
     * @param resourceNames the names of the resources to add. If undefined, all available resources are added.
     * @param proxifyFn optional fn to proxify URLs if needed and work around cross-domain issues; takes 2 arguments : url and boolean isImageUrl
     * @param addLayerCallback callback to be called to add the layer to the map; must return a promise resolved when layer is added
     */
    OL_HELPERS.addLayersFromUrl = function(map, url, mimeType, resourceNames, proxifyFn, addLayerCallback) {

        /*
         mimeType = mimeType || _this.guessMimeType(uri)
         var proxyUri = FRAGVIZ.UTILS.proxifyUrl(uri)
         */


        /*
         var layers = _this.mapLayers = []
         var layerAdder = function (layer) {
         layer.set('isResourceLayer', true); // mark layer as part of displayedResource
         layers.push(layer)
         return map.addLayerWithExtent(layer)

         //if (_this.annotationLayer)
         //    map.setLayerIndex(_this.annotationLayer, map.getNumLayers());
         }
         */
        var layerAdder = addLayerCallback || function (layer) {
            return map.addLayerWithExtent(layer);
        }


        var deferredResult = $.Deferred()

        if (resourceNames === undefined) {
            var parsedUrl = url.split('#', 2);
            var url = parsedUrl[0];
            resourceNames = parsedUrl.length > 1 ? parsedUrl[1].split(',') : undefined;
        } else if (!Array.isArray(resourceNames))
            resourceNames = [resourceNames];

        // default proxifyFn is to return URL as is
        proxifyFn = proxifyFn || function(url) {return url;}
        var proxyUri = proxifyFn(url);

        var matchExtension = function(ext) {
            return OL_HELPERS.SUPPORTED_MIME_TYPES[ext] == mimeType || ext == mimeType;
        }

        //TODO implement done and fail for synchronous calls too
        if (matchExtension('kml')) {
            return layerAdder(OL_HELPERS.createKMLLayer(proxyUri));
        } else if (matchExtension("gml")) {
            return layerAdder(OL_HELPERS.createGMLLayer(proxyUri));
        } else if (matchExtension("geojson") || matchExtension("json")) {
            return layerAdder(OL_HELPERS.createGeoJSONLayer(proxyUri));
        } /*else if (matchExtension("esri_geojson")) {
         return layerAdder(OL_HELPERS.createEsriGeoJSONLayer(proxyUri))
         } */
        else if (matchExtension("wms")) {
            return OL_HELPERS.withWMSLayers(proxyUri, proxifyFn(url, true), layerAdder, resourceNames /*layername*/, true/*useTiling*/, map)
        } else if (matchExtension("wmts")) {
            return OL_HELPERS.withWMTSLayers(proxyUri, layerAdder, resourceNames /*layername*/, undefined/*projection*/, undefined /*resolution*/, undefined /*matrixSet*/);
        } else if (matchExtension("wfs")) {
            return OL_HELPERS.withFeatureTypesLayers(proxyUri, layerAdder, resourceNames /*FTname*/, map, true /* useGET */);
        } else if (matchExtension("arcgis_rest")) {
            return OL_HELPERS.withArcGisLayers(url, layerAdder, resourceNames /*layername*/, proxifyFn , map);
        } else if (matchExtension("wfs3")) {
            return OL_HELPERS.withWFS3Types(proxyUri, layerAdder, resourceNames /*FTname*/, map, proxifyFn);
        } else if (matchExtension("gpkg")) {
            return OL_HELPERS.withGeoPackageLayers(proxyUri, layerAdder, resourceNames /*FTname*/, map);
        }

        return deferredResult;
    }



    /**
     * Convenient code to create a map with default widgets
     * config ::= {
     *      container : [ cssSelector | element ]
     *      featureInfoPopup : [true | false | FeatureInfoOverlay],
     *      featureDetailsControl : [true | false | FeatureDetailsControl],
     *      layerSwitcher : [true | false | HilatsLayerSwitcher],
     *      styleMap: [undefined | style map with optional 'selected', 'highlight' keys ]
     *      baseMapLayer
     * }
     * @param config
     */
    OL_HELPERS.createMap = function(config) {

        var container = typeof config.container == "string" ?
            $(config.container)[0] :
            config.container

        if (!container)
            throw "Container not found: " + config.container;

        var baseMapLayer = config.baseMapLayer;

        // set up featureDetailsControl
        var featureDetailsControl = undefined;
        if (typeof config.featureDetailsControl == "object")
            featureDetailsControl = config.featureDetailsControl
        else if (config.featureDetailsControl === true)
            featureDetailsControl = new OL_HELPERS.FeatureDetailsControl()

        // set up dataPopupOverlay
        var dataPopupOverlay = undefined;
        if (typeof config.featureInfoPopup == "object")
            dataPopupOverlay = config.featureInfoPopup
        else if (config.featureInfoPopup === true)
            dataPopupOverlay = new OL_HELPERS.FeatureInfoOverlay({
                element: $("<div class='ol-feature-popup'><div class='popupContent'></div></div>")[0],
                autoPan: false,
                offset: [5,5],
                showDetails: false
            })

        // set up layerSwitcher
        var layerSwitcher = undefined;
        if (typeof config.layerSwitcher == "object")
            layerSwitcher = config.layerSwitcher
        else if (config.layerSwitcher === true)
            layerSwitcher = new ol.control.HilatsLayerSwitcher()

        var padString = function(str, desiredLength) {
            if (str.length<desiredLength)
                str = ' '.repeat(desiredLength-str.length) + str;

            return str;
        }
        var mousePosControl = new ol.control.MousePosition({
            coordinateFormat: function(coordinates) {
                var coordString = coordinates.map(
                    function(coord, idx) {
                        if (mousePosControl.currentUnit == 'degrees')
                            return padString(parseFloat(coord.toFixed(4)).toString(), idx==0?9:8);
                        else if (mousePosControl.currentUnit == 'm')
                            return padString(parseFloat(coord.toFixed(0)).toString(), 9);
                        else
                            return coord;

                    }
                ).join(',');

                if (mousePosControl.currentScale)
                    coordString = "S:"+mousePosControl.currentScale.toFixed(0) +" | "+ coordString;

                return coordString;
            }
        });
        mousePosControl.updatedView = function(map) {
            this.currentUnit = map.getView().getProjection().getUnits();
            this.currentScale = map.getScale();
        }


        var controls = [
            new ol.control.ZoomSlider(),
            mousePosControl,
            new ol.control.Attribution({collapsed: false})
        ]
        layerSwitcher && controls.push(layerSwitcher);
        featureDetailsControl && controls.push(featureDetailsControl);

        var options = {
            target: container,
            layers: [baseMapLayer],
            controls: controls,
            //fractionalZoom: true

            loadingDiv: false,
            overlays: dataPopupOverlay ? [dataPopupOverlay] : undefined,
            view: new ol.View({
                // projection attr should be set when creating a baselayer
                projection: baseMapLayer.getSource().getProjection() || OL_HELPERS.Mercator,
                extent: baseMapLayer.getExtent(),
                //center: [0,0],
                //zoom: 4
            }),
            loadingListener: layerSwitcher && _.bind(layerSwitcher.isLoading, layerSwitcher)
        }

        var map = new OL_HELPERS.LoggingMap(options);

        map.getView().on('change:resolution', function() {
            mousePosControl.updatedView(map);
        });

        map.on('change:view', function() {
            mousePosControl.updatedView(map);
            map.getView().on('change:resolution', function() {
                mousePosControl.updatedView(map);
            });
        });

        // by default stretch the map to the basemap extent or to the world
        map.getView().fit(
                baseMapLayer.getExtent() || ol.proj.transformExtent(OL_HELPERS.WORLD_BBOX, OL_HELPERS.EPSG4326, map.getView().getProjection()),
            {constrainResolution: false}
        );


        map.featureDetailsControl = featureDetailsControl;
        map.layerSwitcher = layerSwitcher;
        map.dataPopupOverlay = dataPopupOverlay;
        map.styleMap = config.styleMap || OL_HELPERS.DEFAULT_STYLEMAP;

        // Add a feature selection interaction
        if (featureDetailsControl) {
            var featureSelector = map.featureSelector = new ol.interaction.Select({
                multi: true,
                condition: ol.events.condition.click,
                style: function (feature, resolution) {
                    return map.styleMap && map.styleMap.selected;
                },
                filter: function (feature, layer) {
                    return layer != null // exclude unmanaged layers
                        && feature.get('type') != 'capture'
                }
            });
            map.addInteraction(featureSelector);
            featureSelector.on('select', function (evt) {
                map.featureDetailsControl.setFeatures(featureSelector.getFeatures());
            })
        }


        // Add a feature hover interaction
        var highlighter = new ol.interaction.Select({
            style: function(feature, resolution) {
                return map.styleMap && map.styleMap.highlight;
            },
            toggleCondition : function(evt) {return false},
            multi: true,
            condition: ol.events.condition.pointerMove
        });
        highlighter.on('select', function(evt) {
            var hit = highlighter.getFeatures().getLength();
            $(map.getTarget()).css("cursor", hit ? 'pointer' : '');
        })
        map.addInteraction(highlighter);


        // force a reload of all vector sources on projection change
        map.getView().on('change:projection', function() {
            map.getLayers().forEach(function(layer) {
                if (layer instanceof ol.layer.Vector) {
                    layer.getSource().clear();
                }
            });
        });
        map.on('change:view', function() {
            map.getLayers().forEach(function(layer) {
                if (layer instanceof ol.layer.Vector) {
                    layer.getSource().clear();
                }
            });
        });

        return map;
    }


    // after https://gist.github.com/pagameba/671d63f7ee95e4ebe44b
    const styleMap = {
        fill: function(obj) {
          if (typeof obj == 'string' || Array.isArray(obj)) {
            obj = { color: obj };
          }
          return new ol.style.Fill(obj);
        },
        stroke: function(obj) {
          if (typeof obj == 'string' || Array.isArray(obj)) {
            obj = { color: obj };
          } else if (typeof obj == 'number') {
            obj = { width: obj };
          }
          return new ol.style.Stroke(obj);
        },
        text: function(obj) {
          if (typeof obj == 'string') {
            obj = { text: obj };
          }
          if (obj.fill) {
            obj.fill = styleMap.fill(obj.fill);
          }
          if (obj.stroke) {
            obj.stroke = styleMap.stroke(obj.stroke);
          }
          return new ol.style.Text(obj);
        },
        circle: function(obj) {
          if (obj.fill) {
            obj.fill = styleMap.fill(obj.fill);
          }
          if (obj.stroke) {
            obj.stroke = styleMap.stroke(obj.stroke);
          }
          return new ol.style.Circle(obj);
        },
        icon: function(obj) {
          return new ol.style.Icon(obj);
        },
        image: function(obj) {
          if (typeof obj.radius !== 'undefined') {
            return styleMap.circle(obj);
          }
          return styleMap.icon(obj);
        }
      };

      OL_HELPERS.makeStyle = function(styleSpec) {
        if (Array.isArray(styleSpec)) {
          return styleSpec.map(function(oneSpec) {
            return OL_HELPERS.makeStyle(oneSpec);
          });
        }

        var obj = {};
        Object.keys(styleSpec).forEach(function(key) {
          var val = styleSpec[key];
          if (styleMap[key]) {
            obj[key] = new styleMap[key](val);
          } else {
            obj[key] = val;
          }
        });
        return new ol.style.Style(obj);
      }

}) ();


