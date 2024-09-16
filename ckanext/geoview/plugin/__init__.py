# -*- coding: utf-8 -*-

import os
import logging
import mimetypes
from six.moves.urllib.parse import urlparse


from ckan import plugins as p
from ckan.common import json
from ckan.lib.datapreview import on_same_domain
from ckan.plugins import toolkit

import ckanext.geoview.utils as utils

if toolkit.check_ckan_version("2.9"):
    from ckanext.geoview.plugin.flask_plugin import GeoViewMixin
else:
    from ckanext.geoview.plugin.pylons_plugin import GeoViewMixin

ignore_empty = toolkit.get_validator("ignore_empty")
boolean_validator = toolkit.get_validator("boolean_validator")

log = logging.getLogger(__name__)


class GeoViewBase(p.SingletonPlugin):
    """This base class is for view extensions. """

    p.implements(p.IResourceView, inherit=True)
    p.implements(p.IConfigurer, inherit=True)
    p.implements(p.IConfigurable, inherit=True)

    proxy_enabled = False
    same_domain = False

    def configure(self, config):
        basemapConfigFile = toolkit.config.get(
            "ckanext.geoview.basemaps", None
        )
        self.basemapsConfig = basemapConfigFile and utils.load_basemaps(
            basemapConfigFile
        )

    def update_config(self, config):
        toolkit.add_public_directory(config, "../public")
        toolkit.add_template_directory(config, "../templates")
        toolkit.add_resource("../public", "ckanext-geoview")

        self.proxy_enabled = "resource_proxy" in toolkit.config.get(
            "ckan.plugins", ""
        )


class OLGeoView(GeoViewMixin, GeoViewBase):

    p.implements(p.ITemplateHelpers)

    GEOVIEW_FORMATS = [
        "kml",
        "geojson",
        "gml",
        "wms",
        "wfs",
        "esrigeojson",
        "gft",
        "arcgis_rest",
        "wmts",
        "esri rest",
    ]

    # ITemplateHelpers

    def get_helpers(self):
        return {
            "get_common_map_config_geoviews": utils.get_common_map_config,
            "get_openlayers_viewer_config": utils.get_openlayers_viewer_config,
        }

    # IResourceView

    def info(self):
        return {
            "name": "geo_view",
            "title": "Map viewer (OpenLayers)",
            "icon": "globe",
            "iframed": True,
            "default_title": toolkit._("Map viewer"),
            "schema": {
                "feature_hoveron": [ignore_empty, boolean_validator],
                "feature_style": [ignore_empty],
            },
        }

    def can_view(self, data_dict):
        format_lower = data_dict["resource"].get("format", "").lower()
        same_domain = on_same_domain(data_dict)

        # Guess from file extension
        if not format_lower and data_dict["resource"].get("url"):
            format_lower = self._guess_format_from_extension(
                data_dict["resource"]["url"]
            )

        if not format_lower:
            return False

        view_formats = toolkit.config.get(
            "ckanext.geoview.ol_viewer.formats", ""
        )
        if view_formats:
            view_formats = view_formats.split(" ")
        else:
            view_formats = self.GEOVIEW_FORMATS

        correct_format = format_lower in view_formats
        can_preview_from_domain = self.proxy_enabled or same_domain

        return correct_format and can_preview_from_domain

    def view_template(self, context, data_dict):
        return "dataviewer/openlayers.html"

    def form_template(self, context, data_dict):
        return "dataviewer/openlayers_form.html"

    def _guess_format_from_extension(self, url):
        try:
            parsed_url = urlparse(url)
            format_lower = (
                os.path.splitext(parsed_url.path)[1][1:]
                .encode("ascii", "ignore")
                .lower()
            )
        except ValueError as e:
            log.error("Invalid URL: {0}, {1}".format(url, e))
            format_lower = ""

        return format_lower

    def setup_template_variables(self, context, data_dict):
        import ckanext.resourceproxy.plugin as proxy

        same_domain = on_same_domain(data_dict)

        if not data_dict["resource"].get("format"):
            data_dict["resource"][
                "format"
            ] = self._guess_format_from_extension(data_dict["resource"]["url"])

        if self.proxy_enabled and not same_domain:
            proxy_url = proxy.get_proxified_resource_url(data_dict)
            proxy_service_url = utils.get_proxified_service_url(data_dict)
        else:
            proxy_url = data_dict["resource"]["url"]
            proxy_service_url = data_dict["resource"]["url"]

        gapi_key = toolkit.config.get("ckanext.geoview.gapi_key")
        return {
            "resource_view_json": "resource_view" in data_dict
            and json.dumps(data_dict["resource_view"]),
            "proxy_service_url": proxy_service_url,
            "proxy_url": proxy_url,
            "gapi_key": gapi_key,
            "basemapsConfig": self.basemapsConfig,
        }


class GeoJSONView(GeoViewBase):
    p.implements(p.ITemplateHelpers, inherit=True)

    GeoJSON = ["gjson", "geojson"]

    def update_config(self, config):

        super(GeoJSONView, self).update_config(config)

        mimetypes.add_type("application/geo+json", ".geojson")

    # IResourceView
    def info(self):
        return {
            "name": "geojson_view",
            "title": "GeoJSON",
            "icon": "map-marker",
            "iframed": True,
            "default_title": toolkit._("GeoJSON"),
        }

    def can_view(self, data_dict):
        resource = data_dict["resource"]

        format_lower = resource.get("format", "").lower()

        same_domain = on_same_domain(data_dict)

        if format_lower in self.GeoJSON:
            return same_domain or self.proxy_enabled
        return False

    def view_template(self, context, data_dict):
        return "dataviewer/geojson.html"

    def setup_template_variables(self, context, data_dict):
        import ckanext.resourceproxy.plugin as proxy

        self.same_domain = data_dict["resource"].get("on_same_domain")
        if self.proxy_enabled and not self.same_domain:
            data_dict["resource"]["original_url"] = data_dict["resource"].get(
                "url"
            )
            data_dict["resource"]["url"] = proxy.get_proxified_resource_url(
                data_dict
            )

    # ITemplateHelpers

    def get_helpers(self):
        return {
            "get_common_map_config_geojson": utils.get_common_map_config,
            "geojson_get_max_file_size": utils.get_max_file_size,
        }


class WMTSView(GeoViewBase):
    p.implements(p.ITemplateHelpers, inherit=True)

    WMTS = ["wmts"]

    # IResourceView
    def info(self):
        return {
            "name": "wmts_view",
            "title": "wmts",
            "icon": "map-marker",
            "iframed": True,
            "default_title": toolkit._("WMTS"),
        }

    def can_view(self, data_dict):
        resource = data_dict["resource"]
        format_lower = resource.get("format", "").lower()
        same_domain = on_same_domain(data_dict)

        if format_lower in self.WMTS:
            return same_domain or self.proxy_enabled
        return False

    def view_template(self, context, data_dict):
        return "dataviewer/wmts.html"

    def setup_template_variables(self, context, data_dict):
        import ckanext.resourceproxy.plugin as proxy

        self.same_domain = data_dict["resource"].get("on_same_domain")
        if self.proxy_enabled and not self.same_domain:
            data_dict["resource"]["original_url"] = data_dict["resource"].get(
                "url"
            )
            data_dict["resource"]["url"] = proxy.get_proxified_resource_url(
                data_dict
            )

    # ITemplateHelpers

    def get_helpers(self):
        return {
            "get_common_map_config_wmts": utils.get_common_map_config,
        }


class SHPView(GeoViewBase):
    p.implements(p.ITemplateHelpers, inherit=True)

    SHP = ["shp", "shapefile"]

    # IResourceView
    def info(self):
        return {
            "name": "shp_view",
            "title": "Shapefile",
            "icon": "map-marker",
            "iframed": True,
            "default_title": p.toolkit._("Shapefile"),
        }

    def can_view(self, data_dict):
        resource = data_dict["resource"]
        format_lower = resource.get("format", "").lower()
        name_lower = resource.get("name", "").lower()
        same_domain = on_same_domain(data_dict)

        if format_lower in self.SHP or any([shp in name_lower for shp in self.SHP]):
            return same_domain or self.proxy_enabled
        return False

    def view_template(self, context, data_dict):
        return "dataviewer/shp.html"

    def setup_template_variables(self, context, data_dict):
        import ckanext.resourceproxy.plugin as proxy

        self.same_domain = data_dict["resource"].get("on_same_domain")
        if self.proxy_enabled and not self.same_domain:
            data_dict["resource"]["original_url"] = data_dict["resource"].get(
                "url"
            )
            data_dict["resource"]["url"] = proxy.get_proxified_resource_url(
                data_dict
            )

    # ITemplateHelpers

    def get_helpers(self):
        return {
            "get_common_map_config_shp": utils.get_common_map_config,
            "get_shapefile_viewer_config": utils.get_shapefile_viewer_config,
        }
