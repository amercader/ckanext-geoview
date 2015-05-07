// Openlayers preview module

(function() {

    // Establish the root object, `window` in the browser, or `global` on the server.
    var root = this;
    var OL_HELPERS = root.OL_HELPERS = {}

    var $_ = _ // keep pointer to underscore, as '_' will may be overridden by a closure variable when down the stack

    var EPSG4326 = new OpenLayers.Projection("EPSG:4326")
    var Mercator = new OpenLayers.Projection("EPSG:3857")
    var CRS84 = new OpenLayers.Projection("urn:x-ogc:def:crs:EPSG:4326")

    var MAX_FEATURES = 300

    /*
     var default_style = OpenLayers.Util.extend({}, OpenLayers.Feature.Vector.style['default']);
     default_style.fillOpacity = 0.2;
     default_style.graphicOpacity = 1;
     default_style.strokeWidth = "2";
     */


    // override the XMLHttpRequest to enforce UTF-8 decoding
    // because some WFS respond with UTF-8 answers while advertising ISO encoding in the headers
    var originalXHR = OpenLayers.Request.XMLHttpRequest
    OpenLayers.Request.XMLHttpRequest = function () {
        var newXHR = new originalXHR()
        if (newXHR._object && newXHR._object.overrideMimeType) newXHR._object.overrideMimeType('text/xml; charset=UTF-8')
        return newXHR
    }
    $_.each(Object.keys(originalXHR), function (key) {
        OpenLayers.Request.XMLHttpRequest[key] = originalXHR[key]
    })


    OpenLayers.Strategy.BBOXWithMax = OpenLayers.Class(OpenLayers.Strategy.BBOX, {
        update: function (options) {
            var mapBounds = this.getMapBounds() || new OpenLayers.Bounds(-180, -90, 180, 90);

            var maxFeatures = this.layer.protocol && this.layer.protocol.maxFeatures

            if (mapBounds !== null && ((options && options.force) || ((this.layer.features && this.layer.features.length) >= maxFeatures) ||
                (this.layer.visibility && this.layer.calculateInRange() && this.invalidBounds(mapBounds)))) {
                this.calculateBounds(mapBounds);
                this.resolution = this.layer.map.getResolution();
                this.triggerRead(options);
            }
        }
    })

    OpenLayers.Layer.WFSLayer = OpenLayers.Class(OpenLayers.Layer.Vector,
        {
            getDataExtent: function () {
                return (this.ftDescr &&
                    this.ftDescr.bounds &&
                    this.ftDescr.bounds.transform(EPSG4326, this.map.getProjectionObject()))
                    || OpenLayers.Layer.Vector.prototype.getDataExtent.call(this, arguments)
            }
        }
    )

    OpenLayers.Layer.WMSLayer = OpenLayers.Class(OpenLayers.Layer.WMS,
        {
            getDataExtent: function () {
                return (this.mlDescr &&
                    this.mlDescr.llbbox &&
                    new OpenLayers.Bounds(this.mlDescr.llbbox).transform(EPSG4326, this.map.getProjectionObject()))
                    || OpenLayers.Layer.WMS.prototype.getDataExtent.call(this, arguments)
            }
        }
    )

    /**
     * Parse a comma-separated set of KVP, typically for URL query or fragments
     * @param url
     */
    var parseKVP = OL_HELPERS.parseKVP = function (kvpString) {
        var kvps = (kvpString && kvpString.split("&")) || []
        var kvpMap = {}
        for (var idx in  kvps) {
            var kv = kvps[idx].split('=')
            kvpMap[kv[0].toLowerCase()] = kv[1]
        }

        return kvpMap
    }

    /**
     * Parse a comma-separated set of KVP, typically for URL query or fragments
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

        OpenLayers.Request.GET({
            url: url,
            params: {f: "pjson"},
            success: function (request) {
                callback(JSON.parse(request.responseText))
            },
            failure: failCallback || function () {
                alert("Trouble getting ArcGIS descriptor");
                OpenLayers.Console.error.apply(OpenLayers.Console, arguments);
            }
        });
    }

    var parseWFSCapas = function (url, callback, failCallback) {
        var wfsFormat = new OpenLayers.Format.WFSCapabilities();

        OpenLayers.Request.GET({
            url: url,
            params: {
                SERVICE: "WFS",
                REQUEST: "GetCapabilities"
            },
            success: function (request) {
                var doc = request.responseXML;
                if (!doc || !doc.documentElement) {
                    doc = request.responseText;
                }
                var capabilities = wfsFormat.read(doc)
                callback(capabilities)
            },
            failure: failCallback || function () {
                alert("Trouble getting capabilities doc");
                OpenLayers.Console.error.apply(OpenLayers.Console, arguments);
            }
        });
    }


    var parseWFSFeatureTypeDescr = function (url, ftName, ver, callback, failCallback) {
        var format = new OpenLayers.Format.WFSDescribeFeatureType()

        OpenLayers.Request.GET({
            url: url,
            params: {
                SERVICE: "WFS",
                REQUEST: "DescribeFeatureType",
                TYPENAME: ftName,
                VERSION: ver
            },
            success: function (request) {
                var doc = request.responseXML;
                if (!doc || !doc.documentElement) {
                    doc = request.responseText;
                }
                var descr = format.read(doc)
                callback(descr)
            },
            failure: failCallback || function () {
                alert("Trouble getting ft decription doc");
                OpenLayers.Console.error.apply(OpenLayers.Console, arguments);
            }
        });
    }

    var parseWMSCapas = function (url, callback, failCallback) {
        var wmsFormat = new OpenLayers.Format.WMSCapabilities();

        OpenLayers.Request.GET({
            url: url,
            params: {
                SERVICE: "WMS",
                REQUEST: "GetCapabilities"
            },
            success: function (request) {
                var doc = request.responseXML;
                if (!doc || !doc.documentElement) {
                    doc = request.responseText;
                }
                var capabilities = wmsFormat.read(doc)
                callback(capabilities)
            },
            failure: failCallback || function () {
                alert("Trouble getting capabilities doc");
                OpenLayers.Console.error.apply(OpenLayers.Console, arguments);
            }
        });
    }

    OL_HELPERS.createKMLLayer = function (url) {

        var kml = new OpenLayers.Layer.Vector("KML", {
            projection: EPSG4326,
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: url,
                format: new OpenLayers.Format.KML({
                    extractStyles: true,
                    extractAttributes: true,
                    maxDepth: 2
                })
            })
        })

        return kml
    }

    OL_HELPERS.createGFTLayer = function (tableId, GoogleAPIKey) {
        return new OpenLayers.Layer.Vector(
            "GFT", {
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

    OL_HELPERS.createGMLLayer = function (url) {

        var gml = new OpenLayers.Layer.Vector("GML", {
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: url,
                format: new OpenLayers.Format.GML()
            })
        });

        //TODO styles

        return gml
    }

    OL_HELPERS.withFeatureTypesLayers = function (url, layerProcessor, ftName) {

        parseWFSCapas(
            url,
            function (capas) {

                var ver = capas.version
                if (ver == "2.0.0") ver = "1.1.0"  // 2.0.0 causes failures in some cases (e.g. Geoserver TOPP States WFS)

                var candidates = capas.featureTypeList.featureTypes
                if (ftName) candidates = candidates.filter(function (ft) {
                    return ft.name == ftName
                })

                $_.each(candidates, function (candidate, idx) {
                    parseWFSFeatureTypeDescr(
                        url,
                        candidate.name,
                        ver,
                        function (descr) {
                            if (descr.featureTypes) {
                                var geomProps = descr.featureTypes[0].properties.filter(function (prop) {
                                    return prop.type.startsWith("gml")
                                })

                                // ignore feature types with no gml prop. Correct ?
                                if (geomProps && geomProps.length > 0) {

                                    var ftLayer = new OpenLayers.Layer.WFSLayer(
                                        candidate.name, {
                                            //style: default_style,
                                            ftDescr: candidate,
                                            title: candidate.title,
                                            strategies: [new OpenLayers.Strategy.BBOXWithMax({maxFeatures: MAX_FEATURES, ratio: 1})],
                                            projection: Mercator,
                                            visibility: idx == 0,
                                            protocol: new OpenLayers.Protocol.WFS({
                                                headers: {"Content-Type": "application/xml; charset=UTF-8"}, // (failed) attempt at dealing with accentuated chars in some feature types
                                                version: ver,
                                                url: url,
                                                featureType: candidate.name,
                                                srsName: Mercator,
                                                featureNS: undefined,
                                                maxFeatures: MAX_FEATURES,
                                                geometryName: geomProps[0].name
                                            })
                                        })

                                    layerProcessor(ftLayer)
                                }
                            }
                        }
                    )
                })

            }
        )
    }


    OL_HELPERS.withWMSLayers = function (capaUrl, getMapUrl, layerProcessor, layerName) {

        parseWMSCapas(
            capaUrl,
            function (capas) {

                var candidates = capas.capability.layers
                if (layerName) candidates = candidates.filter(function (layer) {
                    return layer.name == layerName
                })

                var ver = capas.version

                $_.each(candidates, function (candidate, idx) {
                    var theProj = null;
                    if (candidate.srs['EPSG:3857']) {
                        theProj = Mercator; // force SRS to 3857 if using OSM baselayer
                    }
                    var mapLayer = new OpenLayers.Layer.WMSLayer(
                        candidate.name,
                        getMapUrl,
                        {layers: candidate.name,
                            transparent: true},
                        {mlDescr: candidate,
                            title: candidate.title,
                            baseLayer: false,
                            singleTile: true,
                            visibility: idx == 0,
                            projection: theProj, // force SRS to 3857 if using OSM baselayer
                            ratio: 1
                        }
                    )

                    layerProcessor(mapLayer)
                })

            }
        )

    }

    OL_HELPERS.createGeoJSONLayer = function (url) {

        var geojson = new OpenLayers.Layer.Vector(
            "GeoJSON",
            {
                projection: EPSG4326,
                strategies: [new OpenLayers.Strategy.Fixed()],
                protocol: new OpenLayers.Protocol.HTTP({
                    url: url,
                    format: new OpenLayers.Format.GeoJSON()
                })
            });

        //TODO add styles

        return geojson
    }


    OL_HELPERS.createEsriGeoJSONLayer = function (url) {

        var esrijson = new OpenLayers.Layer.Vector(
            "Esri GeoJSON",
            {
                projection: EPSG4326,
                strategies: [new OpenLayers.Strategy.Fixed()],
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

    OL_HELPERS.withArcGisLayers = function (url, layerProcessor, layerName) {

        parseArcGisDescriptor(
            url,
            function (descriptor) {

                if (descriptor.type == "Feature Layer") {
                    var newLayer = OL_HELPERS.createArcgisFeatureLayer(url, descriptor, true)
                    layerProcessor(newLayer)
                } else if (descriptor.type == "Group Layer") {
                    // TODO intermediate layer
                } else if (!descriptor.type && descriptor.layers) {
                    var isFirst = true
                    $_.each(descriptor.layers, function (layer, idx) {
                        if (!layer.subLayerIds) {
                            var newLayer = OL_HELPERS.createArcgisFeatureLayer(url + "/" + layer.id, layer, isFirst)
                            layerProcessor(newLayer)
                            isFirst = false
                        }
                    })
                }

            }
        )
    }


    OL_HELPERS.createArcgisFeatureLayer = function (url, descriptor, visible) {

        var esrijson = new OpenLayers.Layer.Vector(
            descriptor.name,
            {
                projection: EPSG4326,
                strategies: [new OpenLayers.Strategy.BBOXWithMax({maxFeatures: MAX_FEATURES, ratio: 1})],
                visibility: visible,
                protocol: new OpenLayers.Protocol.Script({
                    url: url +   //build ArcGIS Server query string
                        "/query?" +
                        //"geometry=-180%2C-90%2C180%2C90&" +
                        "geometryType=esriGeometryEnvelope&" +
                        "inSR=4326&" +
                        "spatialRel=esriSpatialRelIntersects&" +
                        "outFields=*&" +
                        "outSR=4326&" +
                        "returnGeometry=true&" +
                        "returnIdsOnly=false&" +
                        "returnCountOnly=false&" +
                        "returnZ=false&" +
                        "returnM=false&" +
                        "returnDistinctValues=false&" +
                        /*
                         "where=&" +
                         "text=&" +
                         "objectIds=&" +
                         "time=&" +
                         "relationParam=&" +
                         "maxAllowableOffset=&" +
                         "geometryPrecision=&" +
                         "orderByFields=&" +
                         "groupByFieldsForStatistics=&" +
                         "outStatistics=&" +
                         "gdbVersion=&" +
                         */
                        "f=pjson",
                    format: new OpenLayers.Format.EsriGeoJSON(),
                    maxFeatures: 1000,
                    parseFeatures: function (data) {
                        return this.format.read(data);
                    },
                    filterToParams: function (filter, params) {
                        var format = new OpenLayers.Format.QueryStringFilter({srsInBBOX: this.srsInBBOX})
                        var params = format.write(filter, params)
                        params.geometry = params.bbox
                        delete params.bbox

                        return params
                    }
                })
            });

        return esrijson
    }


    OL_HELPERS.displayFeatureInfo = function (map, layer, info, pixel) {
        info.css({
            left: pixel[0] + 'px',
            top: (pixel[1] - 15) + 'px'
        });
        map.getFeatures({
            pixel: pixel,
            layers: [layer],
            success: function (layerFeatures) {
                var feature = layerFeatures[0][0];
                if (feature) {
                    info.tooltip('hide')
                        .attr('data-original-title', feature.get('name'))
                        .tooltip('fixTitle')
                        .tooltip('show');
                } else {
                    info.tooltip('hide');
                }
            }
        });
    };

})();
