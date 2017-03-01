/**
 * 2017/2/28
 * 
 * 说明：
 * 地图模块的封装，包括以下内容：
 * 
 * 1：地图初始化
 * 2：地图基本操作
 * 3：地图的事件注册
 * 
 * @author ghx
 * 
 */
(function(w){

    pollyfill();

    // --------------------------------
    // 以下是公共区
    // --------------------------------
    w.GBMap = w.GBMap || {
        options:{
            mapDiv:"mapDiv",                   // 地图渲染的div的ID
            mapExtent:"-256, 256, -256, 256",   // 地图范围
            maxLevel:17,                        // 最大缩放等级
            minLevel:4,                         // 最小缩放等级
            zoomLevel:8,                        // 初始化缩放等级
            mapProj:"+proj=longlat",            // 地图类型：经纬度
            fixOverlap: true,                   // ff中支持滚轮
            services:[                          // 地图服务
                {name:"vector",url:"http://10.0.0.196:8888/QuadServer/maprequest?services=B_vector"},
                {name:"raster",url:"http://10.0.0.196:8888/QuadServer/maprequest?services=B_raster"}
            ],
            movestyle:1,                        // 移动缩放地图是否带动画
            center:[113.34,32.56],                          // 中心点坐标
            offset:true,                        // 啥意思?
            showCopyright:true,                 // 是否显示版权信息
            debug:true,                         // 是否调试
            //imageUrl:"/images/",              // 有BUG!!!,需要在引入MapExpress.js之前，定义全局变量gb_ImageUrl;地图组件所需的地图图片，初始化地图时需要指定
        },
        init:init,                              // 初始化组件
        getBbox:getBbox,                        // 获取当前地图范围边界[minlong,minlat,maxlong,maxlat]
        getZoom:getZoom,                        // 获取当前地图缩放等级
        addListener:addListener,                // 添加事件 
        removeListener:removeListener,          // 移除事件
        addMarker:addMarker,                    // 添加marker
        addMarkerBatch:addMarkerBatch,          // 批量添加marker
        addPtLayer:addPtLayer,                  // 前端批量添加，有碰撞效果
        clearAll:clearAll,                      // 添加marker
    }
    

    // ----------------
    // 以下是私有区
    // ----------------
    var CACHE = {}; // 缓存对象，用于缓存如回调方法等数据


    // --------------------------------
    // 以下是方法区
    // --------------------------------

    /**
     * 
     * 初始化地图
     * @param {any} opt 
     */
    function init(opt){
        this.options = opt ? Object.assign({},this.options,opt) : this.options;
        
        //w.gb_ImageUrl = w.gb_ImageUrl || this.options.imageUrl;

        // print(this.options);

        var option = new GMapOptions();//定义一个GMapOptions对象（包含了所有初始参数） 
        option.zoomLevel    = this.options.zoomLevel;
        // option.mapServer = addCustomMapServer(mapAddress) ;
        option.mapExtent    = this.options.mapExtent;
        option.fixOverlap   = this.options.fixOverlap;
        option.maxLevel     = this.options.maxLevel;
        option.minLevel     = this.options.minLevel;
        option.offset       = this.options.offset;
        option.mapProj      = this.options.mapProj;
        option.movestyle    = this.options.movestyle;
        option.center       = new GPoint(this.options.center[0],this.options.center[1]);
        option.mapServer    = addCustomMapServer(this.options.services[0]) ;
        //option.jbcom=true;//军标，会影响地图上的浮动层
        w.mapObj = new GMap(this.options.mapDiv, option);   //初始化地图服务器。将刚才定义的GMapServer对象赋值
        w.mapObj.showCopyright(this.options.showCopyright); //不显示地图右下方的版权控件
    }


    /**
     * 获取当前地图范围边界[minlong,minlat,maxlong,maxlat]
     * @returns 地图范围边界[minlong,minlat,maxlong,maxlat]
     */
    function getBbox(){
        var bounds = w.mapObj.getBounds(),
            minX = bounds.minX.toFixed(4),
            minY = bounds.minY.toFixed(4),
            maxX = bounds.maxX.toFixed(4),
            maxY = bounds.maxY.toFixed(4)
            ;

        return [           
            minX,
            minY,
            maxX,
            maxY
        ];
    }
    /**
     * 
     *  获取当前地图缩放等级
     * @returns 地图缩放等级
     */
    function getZoom(){
        return w.mapObj.getZoomLevel();
    }
    /**
     * 
     * 添加事件
     * @param {any} name 事件名：
     * 
     * 地图事件：
     * onMapFinished,onMapDoubleClick,onMapClick,onMoveStart,onMove,onMoveEnd,
     * onMapZoomed,onMapTypeChanged,onInfowindowOpen,onInfowindowClose,onMainMapMouseOver,
     * onMainMapMouseOut,onMainMapMouseMove,onDragStart,onDrag,onDragEnd,
     * 
     * 图层事件：
     * 
     * onAddOverlay,onRemoveOverlay,onRemoveAllOverlay ,onOverlayMouseDown,onOverlayMouseUp,
     * onOverlayMouseOver,onOverlayMouseOut,onOverlayUpdate,onOverlayCreated,onOverlayDblClick,onPolygonDblClick
     * 
     * 批量图层事件：
     * onMoveObjectClicked
     * 
     * @param {any} callback 事件回调
     */
    function addListener(name,callback){
        CACHE[name] = callback;
        w.mapObj.addEventListener(name,callback,this);
    }
    /**
     * 
     * 移除事件
     * @param {any} name 事件名称，详见@see addListener
     */
    function removeListener(name){
        if(CACHE[name]){
            w.mapObj.removeEventListener(name,CACHE[name],this);
            delete CACHE[name];
        }
    }

    /**
     * 地图添加图片点
     * 
     * @param {any} options 参数对象包括{id,geometry,label,icon}
     */
    function addMarker(item){
        var defaultObj = {label:null,alwaysShowLabel:true};
        item = Object.assign({},defaultObj,item);
        var style = getBaseStyle();
        style.iconSrc = item.icon;
        var coord = getCoordByWkt(item.geometry);
        var pt =  new GPoint(coord[0],coord[1]);
        var marker = new GMarker(pt,item.label,style,item.id);
        marker.alwaysShowLabel = item.alwaysShowLabel;
        w.mapObj.addOverlay(marker);
    }

    /**
     * 
     * 批量添加图片点
     * @param {any} data 批量数据，格式：{arr:[{id,geometry,label,...}],layerid,icon} 
     */
    function addMarkerBatch(data){
        data = mergeBatchPointData(data);
        if(data.arr && data.arr.length > 0){
            var strPts='',
                strTips='',
                strLabels='',
                strIds='',
                strRotates='',
                strSpeeds='',
                strBordIdxs='';
            for(var i=0;i<data.arr.length;i++){
                var dp = data.arr[i];
                
                var coord = getCoordByWkt(dp.geometry);
                
                strPts      += coord[0]+','+coord[1]+',';
                strLabels   += (dp.label ? dp.label:'') + '@#';
                strTips     += dp.id + '@#';
                strIds      += dp.id + '@#';
                strRotates  += (dp.rotate ? dp.rotate : 0) + '@#';
                strSpeeds   += (dp.speed ? dp.speed : 0) + '@#';
                strBordIdxs += -1 + '@#'; 
            }
            var style = getBaseStyle();
            style.iconSrc = data.icon;
            // 倒数第5个参数：是否显示label
            // 参数：layerid,样式对象,点内容,弹框内容,
            w.mapObj.addImgObjectLayer(data.layerid,style,strPts,strTips,strLabels,strIds,true,strRotates,strSpeeds,2,strBordIdxs);
            if(data.onClick){
                addListener('onMoveObjectClicked',data.onClick);
            }
        }
    }


    /**
     * 
     * 批量图层，前端碰撞，支持修改label位置
     * @param {any} data  @addMarkerBatch  批量数据，格式：{arr:[{id,geometry,label,...}],layerid,icon,onClick} 
     */
    function addPtLayer(data){
         var strPts='',
            strTips='',
            strLabels='',
            strIds='';

        for(var i=0;i<data.arr.length;i++){
            var dp = data.arr[i];            
            var coord = getCoordByWkt(dp.geometry);            
            strPts      += coord[0]+','+coord[1]+',';
            strLabels   += (dp.label ? dp.label:'') + '@#';
            strTips     += dp.id + '@#';
            strIds      += dp.id + '@#';
        }
        var style = getBaseStyle();
        style.iconSrc = data.icon;
        style.strParam="<strParam>"+
                            "<disx>1</disx>"+
                            "<disy>60</disy>"+
                            "<labx>0</labx>"+
                            "<laby>0</laby>"+
                            "<radius>-1</radius>"+
                            "<type>2</type>"+
                            "<overimg></overimg>"+
                            "<shownum>1</shownum>"+
                            "<pengNumArray>10</pengNumArray>"+
                            "<pengImgSrc>"+data.icon+"</pengImgSrc>"+
                        "</strParam>"; //点半径 
        w.mapObj.addPtLayer(data.layerid,style,strPts,strTips,strLabels,strIds,true,0); 
        if(data.onClick){
            addListener('onMoveObjectClicked',data.onClick);
        }
    }
    

    /**
     * 清除所有图层
     * 
     */
    function clearAll(){
        w.mapObj.removeAllOverlay()
    }

    // --------------------------------
    // 以下是私有方法区
    // --------------------------------


    /**
     * 初始化批量点图层的配置信息
     * 
     * @param {any} data @addMarkerBatch  批量数据，格式：{arr:[{id,geometry,label,...}],layerid,icon,onClick} 
     * @returns 合并好的批量点数据对象
     */
    function mergeBatchPointData(data){
        var defaultObj = {
            arr:null,
            layerid:'layer_'+(1000*Math.random()),
            alwaysShowLabel:true
        };
        return  Object.assign({},defaultObj,data);
    }

    /**
     * 
     * 将wkt格式的点，转换为数组
     * @param {any} wkt 点WKT格式数据 
     * @returns 点坐标数组
     */
    function getCoordByWkt(wkt){
        return  wkt.split('(')[1].split(')')[0].split(' ');
    }

    /**
     * 
     * 获取基础样式对象
     * @returns GStyle对象
     */
    function getBaseStyle() {
        var style = new GStyle();
        style.infoWinWidth  = 320;
        style.infoWinHeight = 180;
        if(ie() != 0){ // IE
            style.infoWinType = GMap.DIVINFOWIN;
        } else {
            style.infoWinType   = GMap.HTMLINFOWIN;
        }
        style.showInfoWindow = false;
        style.borderColor   = '0xFF0000';
        style.border        = true;
        style.bgColor       = '0xffffff';
        style.showBgColor   = true;
        style.fontColor     = '0xff0000';
        style.fontSize      = 12;
        style.imageInfo     = "0xff0000,0x00ff00";
        style.strParam      = '10,13,16,1,1,1.1,1.2,1.3,1.4,1.5,2,4,8';   //半径,必须设置（批量添加图层）

        style.fillColor     = '0x0000ff'; //面
        style.fillOpacity   = 40;       //面

        style.lineColor     = '0xff0000'; //线
        style.lineOpacity   = 80;       //线
        style.lineSize      = 2;        //线
        // style.iconSrc       = URI + "/images/marker_red.png";		//默认的图标
        //0xff0000,0x00ff00,0x0000ff
        style.strParam		= "<strParam><isLayerCollid>0</isLayerCollid><typeColors>0xff0000,0x00ff00,0x0000ff</typeColors><borderSize>0</borderSize><bordstr></bordstr></strParam>";

        return style;
    }

    /**
     * 检测IE版本
     * @returns 返回IE版本，0则非IE
     */
    function ie () {
        //userAgent in IE7 WinXP returns: Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; .NET CLR 2.0.50727)
        //userAgent in IE11 Win7 returns: Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko
        var detectIEregexp;
        if (navigator.userAgent.indexOf('MSIE') != -1){
            detectIEregexp = /MSIE (\d+\.\d+);/; //test for MSIE x.x
        }else{ // if no "MSIE" string in userAgent
            detectIEregexp = /Trident.*rv[ :]*(\d+\.\d+)/; //test for rv:x.x or rv x.x where Trident string exists
        }
        if (detectIEregexp.test(navigator.userAgent)) { //if some form of IE
            var ieversion = Number(RegExp.$1); // capture x.x portion and store as a number
            return ieversion;
            // if (ieversion>=12)
            //     // document.write("You're using IE12 or above")
            // else if (ieversion>=11)
            //     document.write("You're using IE11 or above")
            // else if (ieversion>=10)
            //     document.write("You're using IE10 or above")
            // else if (ieversion>=9)
            //     document.write("You're using IE9 or above")
            // else if (ieversion>=8)
            //     document.write("You're using IE8 or above")
            // else if (ieversion>=7)
            //     document.write("You're using IE7.x")
            // else if (ieversion>=6)
            //     document.write("You're using IE6.x")
            // else if (ieversion>=5)
            //     document.write("You're using IE5.x")
        }else {
            // document.write("n/a")
            return 0;
        }
    };

    /**
     * 
     * 添加服务器
     * @param {any} item 背景图服务对象{name,url}
     * @returns GMapServer 对象
     */
    function addCustomMapServer(item) {
		var server  = new GMapServer();
		server.type = GMapViews.MAPSERVER;//Geobeans 栅格地图服务
		server.name = item.name;
		server.address = item.url;
		return server;
    }

    /**
     * 
     * 打印日志
     * @param {any} obj 被打印对象
     */
    function print(obj){
        if(this.options.debug){
            var rs = obj;
            if(typeof obj !== 'string'){
                rs = JSON.stringify(obj);
            }
            w.console = w.console || {log:function(){}};

            w.console.log(t() + " : " + rs);

            function t(){
                 var date = new Date();
                 return date.getHours()+":"+date.getMinutes()+":"+date.getSeconds();
            }
        }
    }

    /**
     * pollyfill 兼容老IE
     */
    function pollyfill(){
        if (typeof Object.assign != 'function') {
            (function () {
                Object.assign = function (target) {
                'use strict';
                if (target === undefined || target === null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                var output = Object(target);
                for (var index = 1; index < arguments.length; index++) {
                    var source = arguments[index];
                    if (source !== undefined && source !== null) {
                    for (var nextKey in source) {
                        if (Object.prototype.hasOwnProperty.call(source, nextKey)) {
                        output[nextKey] = source[nextKey];
                        }
                    }
                    }
                }
                return output;
                };
            })();
        }
    }

}(window))