class ResponseController {
  notFoundPage(req, res) {
    res.render("404", { error: req.flash(`error`) });
  }
}

module.exports = ResponseController;
