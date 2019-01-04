String.prototype.linkify_tweet = function() {
    var tweet = this.replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]|)/ig,"<a href='$1' target=_blank>$1</a>");
    tweet = tweet.replace(/(^|\s)@(\w+)/g, "$1<a href=\"http://www.twitter.com/$2\">@$2</a>");
    return tweet.replace(/(^|\s)#(\w+)/g, "$1<a href=\"http://search.twitter.com/search?q=%23$2\">#$2</a>");
};
