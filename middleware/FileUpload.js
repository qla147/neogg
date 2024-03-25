const formidable = require("formidable");
const config = global._config;
const form = formidable({
    uploadDir: config.filePath
});




const fileMiddleware = (req, res, next)=>{
    form.parse(req, (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }
        req.fields = fields;
        req.files = files;
        next();
    });

}

module.exports =  fileMiddleware