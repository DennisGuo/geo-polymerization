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
    res.render('index');
});

app.listen(PORT, function () {
    console.log("Server is up, listening on port : " + PORT);
})