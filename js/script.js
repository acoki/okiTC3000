dojo.require("esri.map");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojo.data.ItemFileReadStore");
dojo.require("esri.tasks.find");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.form.Button");


var findTask, findParams;
var map, startExtent;
var grid, store;

function init() {
    dojo.connect(grid, "onRowClick", onRowClickHandler);

    //Create map and add the ArcGIS Online imagery layer
    startExtent = new esri.geometry.Extent({ "xmin": -9459781, "ymin": 4748484, "xmax": -9382885, "ymax": 4770727, "spatialReference": { "wkid": 102113 } });
    map = new esri.Map("map", { extent: startExtent });

    var streetMapLayer = new esri.layers.ArcGISTiledMapServiceLayer("http://gis.oki.org/ArcGIS/rest/services/Maps/okibasemap_minimal/MapServer");
    map.addLayer(streetMapLayer);
	
	//Create Find Task using the URL of the map service to search
    findTask = new esri.tasks.FindTask("http://gis.oki.org/ArcGIS/rest/services/OP/TrafficCounts/MapServer/");

    //Create the find parameters
    findParams = new esri.tasks.FindParameters();
    findParams.returnGeometry = true;
    findParams.layerIds = [0];
    findParams.searchFields = ["Main_Stree", "Cross_Stre"];
    findParams.outSpatialReference = map.spatialReference;

    dojo.connect(map, 'onLoad', function (theMap) {
        //resize the map when the browser resizes
        dojo.connect(dijit.byId('map'), 'resize', map, map.resize);
    });
}

function doFind() {
    //Set the search text to the value in the box
    findParams.searchText = dojo.byId("streetName").value;
    findTask.execute(findParams, showResults);
}

function showResults(results) {
    //This function works with an array of FindResult that the task returns
    map.graphics.clear();
    //var symbol = new esri.symbol.SimpleFillSymbol(esri.symbol.SimpleFillSymbol.STYLE_SOLID, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([98, 194, 204]), 2), new dojo.Color([98, 194, 204, 0.5]));
	var symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_SQUARE, 10, new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, new dojo.Color([255, 0, 0]), 1), new dojo.Color([0, 255, 0, 0.25]));

    //create array of attributes
    var items = dojo.map(results, function (result) {
        var graphic = result.feature;
        graphic.setSymbol(symbol);
        map.graphics.add(graphic);
        return result.feature.attributes;
    });


    //Create data object to be used in store
    var data = {
        identifier: "OBJECTID",  //This field needs to have unique values
        label: "OBJECTID", //Name field for display. Not pertinent to a grid but may be used elsewhere.
        items: items
    };

    //Create data store and bind to grid.
    store = new dojo.data.ItemFileReadStore({ data: data });
    var grid = dijit.byId('grid');
    grid.setStore(store);

    //Zoom back to the initial map extent
    map.setExtent(startExtent);

}

//Zoom to the parcel when the user clicks a row
function onRowClickHandler(evt) {
    var clickedTrafficCountId = grid.getItem(evt.rowIndex).OBJECTID;
    var selectedTrafficCount;

    dojo.forEach(map.graphics.graphics, function (graphic) {
        if ((graphic.attributes) && graphic.attributes.OBJECTID === clickedTrafficCountId) {
            selectedTrafficCount = graphic;
            return;
        }
    });
    map.centerAndZoom(selectedTrafficCount.geometry, 24);
}

dojo.addOnLoad(init);