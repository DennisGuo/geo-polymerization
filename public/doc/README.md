# 使用和测试

1. 点的聚类服务接口

====

1.1 点数据上传接口
---

1）GeoJSON点信息的上传

通过HTTP协议上传照片文件,使用HTTP POST方法，对应的URL是
http://localhost:8800/point-store/

消息体是GeoJSON格式的点信息，需要在HTTP请求消息头中指定二进制照片的MIME数据类型，HTTP请求对应的消息头如下:

```
Content-Type: application/geo+json
```

一个上传GeoJSON点文件的例子，

```
curl -H "Content-Type: application/geo+json" http://localhost:8800/point-store/ --data-binary @my-location.geojson
```

点文件名my-location.geojson，内容为：

```
{
   "type": "Feature",
   "geometry": {
       "type": "Point",
       "coordinates": [102.0, 0.5]
   },
   "properties": {
       "id": "13579",
       "datetime": "2015:10:07 10:54:22",
       "name": "abc"
   }
}
```


2) 照片数据的上传

服务自动从照片的exif中提取地理位置信息

通过HTTP协议上传照片文件,使用HTTP POST方法，对应的URL是
http://localhost:8800/photo-store/

消息体即为二进制的照片数据，需要在HTTP请求消息头中指定二进制照片的MIME数据类型，目前只支持jpeg图像，因此HTTP请求对应的消息头如下:

```
Content-Type: image/jpeg
```

有两种上传方式：

a) 上传照片文件，照片数据中的EXIF元数据已经自带地理位置信息：

```
curl -H "Content-Type: image/jpeg" http://localhost:8800/photo-store/ --data-binary @IMG_20151007_105422.jpg
```

b) 上传照片文件，照片EXIF没有地理位置信息，需要通过URL路径指定该照片的地理位置（例子中的位置信息是经度：110.2345，纬度：34.789）：

```
curl -H "Content-Type: image/jpeg" http://localhost:8800/photo-store/110.2345/34.789 --data-binary @IMG_0672.JPG
```

如果使用此方式上传的照片EXIF元数据中有GPS地理位置，则以照片中的EXIF数据为准，忽略URL路径中的地理位置数据。


1.2 点聚合查询接口
---

1) 参数以URL查询参数的形式，例如

```
curl -H "Accept: application/json" 'http://127.0.0.1:8800/cluster?bbox=120.0,45.0,100.0,25.0&zoom=3'
```

或者

```
curl -H "Accept: application/json" 'http://127.0.0.1:8800/cluster/photo?bbox=120.0,45.0,100.0,25.0&zoom=3'
```

2) 聚合查询到返回结果直接从HTTP响应消息到状态判断成功与否
每个聚合点中增加一个外链href用于指示“详情查询接口”的参数

a) 查询照片点聚合

```
curl  -H "Accept: application/json" "http://localhost:8800/cluster/mo?zoom=3&bbox=119.4,32.3,120.3,34.9"
```

上面的例子返回：

```js
[
    {"bbox":[121.649,28.4033,121.649,28.4033],"geometry":{"coordinates":[121.649,28.4033],"type":"Point"},"properties":{"count":1,"href":"/cpoint/8-215-107/mo"},"type":"Feature"},{"bbox":[121.857,29.1254,122.389,30.1432],"geometry":{"coordinates":[121.96841666666667,29.919436190476187],"type":"Point"},"properties":{"count":70,"href":"/cpoint/8-215-106/mo"},"type":"Feature"}
]
```

1.3 点聚合详情查询接口
---

路径参数来自上一个聚合查询返回结果，例如

```
curl -H "Accept: application/json" "http://127.0.0.1:8800/cpoint/8-215-107/mo"
```

返回结果：

```
{
  "bbox": [
    121.649,
    28.4033,
    121.649,
    28.4033
  ],
  "features": [
    {
      "geometry": {
        "coordinates": [
          121.649,
          28.4033
        ],
        "type": "Point"
      },
      "properties": {
        "class": "mo",
        "datetime": "2013:05:29 13:55:28",
        "id": "13372545024_C",
        "name": "WJ10-BC609"
      },
      "type": "Feature"
    }
  ],
  "type": "FeatureCollection"
}}
```

2. 设计与实现
===

系统性能需求
- 服务能支撑大约6000名用户的同时上传／下载
- 上传的图片数据是只增不减的，数据的存储应该是可扩展的

- 基于REST风格的API设计原则。但是分离了图片的保存（Store）和读取操作。
- 无状态可伸缩的服务


前端：
前端web服务由photo_tms节点实现，每个photo_tms节点是一个独立的web服务器，负责相片的上传和下载

系统前端服务的可伸缩性由独立的photo_tms节点实现。

web服务器支持HTTP/2协议, 兼容HTTP/1.1

后端：
集群存储的可伸缩是由riak服务器节点实现。

以上设计通过保证服务的可伸缩性，使得系统即可以在单机上部署提供服务，也能在系统业务增长时通过简单的增加服务器的方式扩充系统服务能力。

所有的节点（photo_tms节点和riak节点）都是独立的，可以分别单独部署在不同的机器上，也可以集中在单台机器上。系统运行时可以动态的增加或者删除节点，从而实现服务系统的可伸缩性。
系统架构图如下所示

```
     +------------------------------------------------+
     |                  Client                        |
     +---------+---------------+--------------+-------+
               |               |              |
         HTTP  |               |              |
       POST/GET|               |              |
               |               |              |
          +----v------+  +-----v-----+  +-----v-----+
          | photo_tms |  | photo_tms |  | photo_tms |
          |   node    |  |   node    |  |   node    |
          +----+------+  +-----+-----+  +-----+-----+
               |               |              |
               |               |              |
+---------------------------------------------------------------+
               |               |              |
               |       +-------v-----+        |
               |       |  riak node  |        |
    +----------v--+    +-------------+   +----v--------+
    |  riak node  +----+          +------+  riak node  |
    +----------+--+                      +----+--------+
               |                              |
            +--+----------+       +-----------+-+
            |  riak node  +-------+  riak node  |
            +-------------+       +-------------+

```

4. TODO
===

- 缩略图的生成
- 性能，数据库连接池
- 可靠性的测试
- 其它格式的图像文件支持（？）

5. 参考
RESTful API的设计参考了：
http://marcelo-cure.blogspot.com/2016/09/rest-anti-patterns.html
GeoJSON标准
https://tools.ietf.org/html/rfc7946
