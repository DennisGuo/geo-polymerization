var express = require("express");
var proxy = require('express-http-proxy');

var app = express();

var PORT = 7005;
var API_TARGET = "http://10.0.0.186:8800";


app.set('view engine', 'ejs');

app.use(express.static("public",{
    maxAge:'30d'
}));
app.use("/api", proxy(API_TARGET));

app.get("/",function(req,res){
    res.render('index',{title:""});
});

app.get("/readme",function(req,res){
    var fs = require('fs'); 
    fs.readFile('public/doc/README.md','utf8',function(err,data){
        var html ;
        if(err){
            html = '<b class="alert alert-danger">错误：'+err.message+'</b>';
        }else{
            var marked = require('marked');
            marked.setOptions({
                highlight: function (code) {
                    return require('highlight.js').highlightAuto(code).value;
                }
            });
            html = marked(data);
        }
        
        res.render('readme',{title:"服务接口文档",html:html});
    });
    
});

app.listen(PORT, function () {
    console.log("Server is up, listening on port : " + PORT);
})