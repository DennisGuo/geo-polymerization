(function ($) {

    var loadDataTimer, resizeTimer;

    init();

    function init() {
        $(function () {
            var mapOptions = {
                zoomLevel: 7,
                showCopyright: false
            };

            GBMap.init(mapOptions);
            GBMap.addListener("onMapZoomed", onMapBboxChanged);
            GBMap.addListener("onMoveEnd", onMapBboxChanged);
            // GBMap.addListener("onDragEnd",onMapBboxChanged); // onDragEnd 事件无效

            loadDataTimer = setTimeout(readMapInfo, 600);
            resizeTimer = setTimeout(resize, 100);

            $(window).resize(function () {
                resizeTimer && clearTimeout(resizeTimer);
                resizeTimer = setTimeout(resize, 100);
            });

        });
    }

    function resize() {
        var wH = $(window).height();
        var mH = wH - 60 - 20 - 40;
        mH = mH < 200 ? 200 : mH;
        $('#mapDiv').css('height', mH);
    }

    function onMapBboxChanged(event) {
        loadDataTimer && clearTimeout(loadDataTimer);
        loadDataTimer = setTimeout(readMapInfo, 600);
        //console.log(event);
    }

    function readMapInfo() {
        // console.log('render info.');
        var zoom = GBMap.getZoom();
        var bbox = GBMap.getBbox();
        renderInfo(zoom, bbox);
        loadData(zoom, bbox);
    }

    function renderInfo(zoom, bbox) {
        $('#bbox').text(bbox.join(','));
        $('#zoom').text(zoom);
    }

    function loadData(zoom, bbox) {
       
        var before = new Date().getTime();
        $.get("/api/cluster/mo?bbox=" + bbox.join(',') + "&zoom=" + zoom, function (data) {
            var midle = new Date().getTime();
            //console.log(data);
            var arr = data.data,
                prex = getUri() + '/images/icon';
                iconMany = prex +'/red_marker.png',
                iconSingle = prex + '/blue_marker.png',
                single = {
                    layerid:'layer_single',
                    arr:[],
                    icon:iconSingle,
                    onClick:onClickLayer
                },
                many = {
                    layerid:'layer_many',
                    arr:[],
                    icon:iconMany,
                    onClick:onClickLayer
                };           

            for(var i=0;i<arr.length;i++){
                var pt = arr[i];
                var obj = {
                        id:pt.href,
                        geometry: pt.geometry,
                        label: pt.count == 1 ? null : pt.count,
                };
                if(pt.count == 1){
                    single.arr.push(obj);
                }else{
                    many.arr.push(obj);
                }
            }

            GBMap.clearAll();
            GBMap.addPtLayer(single);
            GBMap.addPtLayer(many);
            // GBMap.addMarkerBatch(single);
            // GBMap.addMarkerBatch(many);

            var after = new Date().getTime();
            $('#time-service').text((midle - before)+" ms");
            $('#time-render').text((after - midle)+" ms");

            // if (arr.length > 0) {
            //     GBMap.clearAll();
            //     var midle = new Date().getTime();
            //     for (var i = 0; i < arr.length; i++) {
            //         var pt = arr[i];
            //         GBMap.addMarker({
            //             id:pt.href,
            //             geometry: pt.geometry,
            //             label: pt.count == 1 ? null : pt.count,
            //             icon: pt.count == 1 ? iconSingle : iconMany
            //         });
            //     }
            //     var after = new Date().getTime();
            //     $('#time-service').text((midle - before)+" ms");
            //     $('#time-render').text((after - midle)+" ms");
            // }

        });
    }

    /**
     * 
     * 批量图层点击回调方法
     * @param {any} event 
     */
    function onClickLayer(event){
         //解析event的参数  
        var arr = event.args.split(",");  //layerid,id
        if(arr[0] === 'layer_many'){

        }
    }

    function getUri(){
        return window.location.protocol + "//" + window.location.hostname + ":" + window.location.port;
    }

}(jQuery));