var vol = [1, 1450, 4675, 7411, 11530, 14415, 17575, 22678, 28108, 32804, 38700, 42210, 48903];
var ekanji = false;

$(function() {
    var ucs = {};
    var missing = [];
    var memo = [];
    $("<div>").attr("id", "content_refdiff").addClass("content").appendTo("#list")

    $.get("mj0502_pickup.txt", function(txt) {
        txt.split("\n").forEach(function(line) {
            if (!line) return;
            var tbl = line.trim().split("\t");
            var m = tbl.shift().match(/^(補?)([0-9]+)('*)$/);
            if (!m) { console.log(line); return; }
            var code = (m[1] ? "DH" : "D") + ("0000" + m[2]).substr(m[1] ? -4 : -5) + "." + m[3].length;
            //console.log(code);
            tbl.shift();
            ucs[code] = tbl.filter(u => u!="").map(function(u){
                return encode_ref(u.replace(/U\+([0-9A-F]+)/gi, "&#x$1;"));
            });
        });
        redraw(location.href.split("#")[1]);
    });

    $.get("dkw2ucs.txt", function(txt) {
        txt.split("\n").forEach(function(line) {
            if (!line) return;
            var data = line.split("#");
            //欠番
            if (data[1]) {
                if (data[1].indexOf("removed") != -1 ||
                    data[1].indexOf("missing") != -1 ||
                    data[1].indexOf("moved") != -1) {
                    missing.push(data[0].trim().split(" ").shift());
                    return;
                }
            }
            var tbl = data[0].trim().split(" ");
            var code = tbl.shift();
            tbl.shift(); // 部首
            tbl.shift(); // 部画
            tbl.shift(); // 頁

            if (!ucs[code]) ucs[code] = [];

            // mjiとkdbとownの合併
            ucs[code] = merge_sets(ucs[code], tbl, updated[code], code);
        });

        console.log(memo);
        redraw(location.href.split("#")[1]);
        $("#searchbar").val("");
        $("#searchbar").change();
        return;
        
        var $list = $("#content_refdiff");
        memo.forEach(function(diff) {
            var dkw = diff[0];
            var mji = diff[1];
            var kdb = diff[2];
            var own = diff[3];

            // (1)
            if (mji.length == 0 && own.length == 0) return;
            if (kdb.length == 0 && own.length == 0) return;

            // (5)
            if (!mji.some(c => kdb.join().indexOf(c) == -1)) return;
            if (kdb[0] && kdb[0].match(/^D/)) {
                var kdbc = ucs[kdb[0]];
                if (!mji.some(c => kdbc.join().indexOf(c.replace(/\uDB40[\uDD00-\uDdeF]/g, "")) == -1)) return;
            }
            // (4)
/*
        var own0 = own.map(u => is_cjkcompat(u) || u.replace(/\*|\uDB40[\uDD00-\uDdeF]/g, ""))
            .filter((c, i, self) => (self.indexOf(c) == i)).sort();

        if (mji0.join() != kdb0.join() || (own.length != 0)) {
            var own0 = own.map(u => u.replace(/\uDB40[\uDD00-\uDdeF]/g, ""))
                .filter((c, i, self) => (self.indexOf(c) == i)).sort();
            var mji0 = mji.map(u => u.replace(/\uDB40[\uDD00-\uDdeF]/g, ""))
                .filter((c, i, self) => (self.indexOf(c) == i)).sort();
            if (own0.join() == mji0.join() && mji.join().match(/\uDB40[\uDD00-\uDdeF]/)) {
            } else return;

*/
            var evac = ucs[dkw];
            var $group = $("<div>").appendTo($list).css("padding", "0").addClass("group");

            ucs[dkw] = mji;
            var $div = $("<div>").appendTo($group).css("border", "none");
            show_cell(dkw, $div, false);
            ucs[dkw] = kdb;
            var $div = $("<div>").appendTo($group).css("border", "none");
            show_cell(dkw, $div, false);
            if (own.length > 0) {
                ucs[dkw] = own;
                $group.css("border", "1px solid red");
                var $div = $("<div>").appendTo($group).css("border", "none");
                show_cell(dkw, $div, false);
            }
            ucs[dkw] = evac;

	    if (mji_mis.indexOf(dkw) != -1)
	
		console.log(dkw,  Array.from(mji.join("")).map(function(c) {
                    if (!c.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]$/))
                        return c.charCodeAt(0);
                    return ((c.charCodeAt(0) & 0x3ff) << 10 | (c.charCodeAt(1) & 0x3ff)) + 0x10000;
                }).map(ucs => "U+" + ucs.toString(16).toUpperCase()).join("-"),
			    Array.from(kdb.join("")).map(function(c) {
                    if (!c.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]$/))
                        return c.charCodeAt(0);
                    return ((c.charCodeAt(0) & 0x3ff) << 10 | (c.charCodeAt(1) & 0x3ff)) + 0x10000;
                }).map(ucs => "U+" + ucs.toString(16).toUpperCase()).join("-")
			    
			    );

            // (1) kdbまたはmjiしかないもの
            // (2) own == mji == (kdb + ivs) なもの (ownが不要なため除去)
            // (3) own ≒ mji == (kdb + ivs) なもの (ownが不要なため除去)
            // (4) own ≒ (mji + ivs) = (kdb + ivs) なもの
            // (5) mji ⊂ kdb なもの
        });
        set_cell_clickevents();
        $list.append("[" + $list.find("div.group").size() + "]<br/>");
    });

    // mjiとkdbとownの合併
    var merge_sets = function(mji, kdb, ownt, dkw)
    {
        if (!mji) mji = [];
        if (!kdb) kdb = [];
        var own = (ownt) ? ownt[0].split(",") : [];

        //書式を揃える。
        kdb = kdb.map(u => encode_ref(u.replace(/U\+([0-9A-F]+)/gi, "&#x$1;")))
            .filter(c => (!c.match(/[\u3100-\u312F]/)));
        own = own.map(function(c) {
            var m = c.match(/^(.+):([0-9x]+)$/);
            if (!m) return c;
            var ivs = parseInt(m[2], 10);
            if ("0123456789".indexOf(m[2]) != -1)
                return m[1] + "U+" + (0xe0100 + ivs).toString(16);
            return m[1] + "*";
        }).map(u => encode_ref(u.replace(/U\+([0-9A-F]+)/gi, "&#x$1;")));
        
        //結合
        var ret = kdb.concat(mji).concat(own);
        
        //かぶりは除去
        ret = ret.filter(function (c, i, self) {
            return (self.indexOf(c) == i)
                && (self.indexOf(c + "*") == -1)
                && (c == self.find(c0 => (c0.indexOf(c) == 0)));
        }).sort(function(c0, c1) {
            //並べ替え: 重複 > 異体字セレクタ表現 > 補助漢字 > URO > Ext
            var a = c0.match(/^D/) ? 1 : 0;
            var b = c1.match(/^D/) ? 1 : 0;
            if (b - a != 0) return b - a;
            var a = c0.match(/\uDB40[\uDD00-\uDdeF]/) ? 1: 0;
            var b = c1.match(/\uDB40[\uDD00-\uDdeF]/) ? 1: 0;
            if (a - b != 0) return b - a;
            var a = is_cjkcompat(c0) ? 1 : 0;
            var b = is_cjkcompat(c1) ? 1 : 0;
            return b - a;
        });

        //return ret;
        // 差分チェック
        // 統合漢字表現でそろえる。
        var mji0 = mji.map(u => is_cjkcompat(u) || u.replace(/\*|\uDB40[\uDD00-\uDdeF]/g, ""))
            .filter((c, i, self) => (self.indexOf(c) == i)).sort();
        var kdb0 = kdb.map(u => is_cjkcompat(u) || u.replace(/\*|\uDB40[\uDD00-\uDdeF]/g, ""))
            .filter((c, i, self) => (self.indexOf(c) == i)).sort();

        var own0 = own.map(u => is_cjkcompat(u) || u.replace(/\*|\uDB40[\uDD00-\uDdeF]/g, ""))
            .filter((c, i, self) => (self.indexOf(c) == i)).sort();

        if (mji0.join() != kdb0.join() ||
            (own.length != 0 &&
             (mji0.join() != kdb0.join() ||
              mji0.join() != own0.join() ||
              own0.join() != kdb0.join()))) {
            memo.push([dkw, mji, kdb, own]);
            //if (own.length != 0 && own0.join() != mji0.join()) console.log(dkw);
        }
        
        return ret;
    };

    
    var cjkrange = [];
    var PER = 200;

    // テーブル描画する
    var redraw = function(str) {
        var is_hokan = false;
        if (!str) str = "";
        if (str.indexOf("h") != -1) { is_hokan = true; str = str.split("h").join(""); }
        var val = parseInt(str, 10);
        $("#pager a").removeClass("selected").each(function() {
            var aval = $(this).text();
            var hval = val.toString(10) + (is_hokan ? "h" : "");
            if (aval == hval) $(this).addClass("selected");
        });
        var st = val * 100 + 1;
        
        if (!st) st = 1;

        $("#list .content").hide();
        $("#cjktable").text("").show();

        for (var i = 0; i < PER / 20; i++) {
            var $tr = $("<tr>").appendTo("#cjktable");
            for (var j = 0; j < 20; j++) {
                var $td = $("<td>").appendTo($tr);
            }
        }
        $("#cjktable td").each(function(idx) {
            var $td = $(this);

            var set_td = function(dash) {
                var code = "D" + ("0000" + (st + idx).toString(10)).substr(-5) + "." + dash;
                if (is_hokan)
                    code = "DH" + ("0000" + (st + idx).toString(10)).substr(-4) + "." + dash;
                
                if (dash != 0) {
                    if(!ucs[code]) return;
                    $td = $("<td>").insertAfter($td);
                }
                show_cell(code, $td);
            };
                
            set_td(0);
            set_td(1);
            set_td(2);
        });

        set_cell_clickevents();
    };

    // セルのクリックイベントを付加する
    var set_cell_clickevents = function() {
        $(".cell").click(function() {
            var $rem = $(this).find(".remarks");
            if ($rem.is(":visible")) {
                return;
            }
            $("div.remarks").hide();
            $rem.show();

            var ucs = $(this).find(".h").map(function() {return $(this).text(); }).get()
                .map(function(str) {
                    return Array.from(str).map(function(c) {
                        if (!c.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]$/))
                            return c.charCodeAt(0);
                        return ((c.charCodeAt(0) & 0x3ff) << 10 | (c.charCodeAt(1) & 0x3ff)) + 0x10000;
                    }).map(ucs => "U+" + ucs.toString(16).toUpperCase()).join(" ");
                });
            $("#ucs").text(ucs.map(str => "[" + str + "]").join("")).show();
        });
    };

    // セルを描画する
    var show_cell = function(code, $td, is_exposed) {
        $td.addClass("cell");
        var $h = $("<span>").addClass("h").appendTo($td);
        var $c = $("<span>").addClass("c").text(dkwformat(code)).appendTo($td);

        //欠番
        if (!ucs[code]) {
            $td.css("background-color", "#aaa");
            return;
        }

        //UCS未定義(安岡論文による22字)
        if (ucs[code][0] == "") {
            var dp = code.substr(1).split(".");
            var imgname = "dkw-" + dp[0].toLowerCase() + "d".repeat(dp[1] * 1);
            $("<img>").appendTo($h).attr("src", "../kDB/" + imgname + ".svg").css("width","50px");
            $td.css("background-color", "#ffd");
            return;
        }

        var set_char = function(c, $dom) {
            //重複
            if (c.indexOf("D") == 0) {
                var d = ucs[code][0];
                $dom.addClass("d").html(ucs[d][0]);
                $("<span>").addClass("c").text("(=" + dkwformat(d) + ")").appendTo($dom);
                $dom.parent().css("background-color", "#aaa");
                return;
            }

            $dom.html(c).addClass("h");
            var c = $dom.text();
            if (is_cjkcompat(c)) {
                $dom.css("color", "blue");
                return;
            }
            if (c.match(/\uDB40[\uDD00-\uDdeF]/)) {
                $dom.css("color", "#080");
                console.log(code,
                    Array.from(c).map(function(c) {
                        if (!c.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]$/))
                            return c.charCodeAt(0);
                        return ((c.charCodeAt(0) & 0x3ff) << 10 | (c.charCodeAt(1) & 0x3ff)) + 0x10000;
                    }).map(ucs => "U+" + ucs.toString(16).toUpperCase()).join(" "));
                return;
            }
            if (c.substr(-1) === "*") {
                $dom.css("color", "red");
                $dom.text(c.substr(0, c.length - 1));
            }
            //console.log(code, c,":0"); //$dom.append("&#xe0100;");
        };
        
        //通常
        var $rem = $("<div>").addClass("remarks").appendTo($c).hide();
        if (typeof(ucs[code]) != "object") return;
        ucs[code].forEach(function(c, i) {
            if (is_exposed) {
                $h.css("width","auto");
                set_char(c, $("<span>").css("display", "inline").appendTo($h));
                return;
            }
            set_char(c, i == 0 ? $h : $("<span>").appendTo($rem));
        });

        if (1 < ucs[code].length && !is_exposed)
            $c.css({"position": "relative", "background-color":"#cfc"});

        if (!ekanji) return;
         if (!code.match(/D[0-9]+\.0/)) return;
         var dir = parseInt((parseInt(code.substr(1,5), 10) - 1) / 1000);
         $("<img>").attr("src", "http://ekanji.u-shimane.ac.jp/PrjEkanji/picture/dai/" +
                         + (dir * 1000 + 1) + "-" + (dir * 1000 + 1000)
                         + "/dai0" + code.substr(1,5) +".gif")
             .css({"width":"24px", "height":"24px"}).appendTo($h);
         $h.css("height", "auto");

    };

    // CJK互換を統合漢字に変換する; otherwise false
    var is_cjkcompat = function(c) {
        if (c.match(/^[\uF900-\uFAFF]/)) {
            var offset = c.charCodeAt(0) - 0xf900;
            if (offset < 0) return false;
            var uni = cjkcompat[0][offset];
            if (!uni) return false;
            return String.fromCodePoint(uni) || false;
        }
        if (c.match(/^[\uD800-\uDBFF][\uDC00-\uDFFF]/)) {
            c = c.substr(0, 2);
            var code = (c.charCodeAt(0) & 0x3ff) << 10 | (c.charCodeAt(1) & 0x3ff);
            code += 0x10000;
            if (code < 0x2f800 || 0x2fb00 <= code) return false;
            return String.fromCodePoint(cjkcompat[1][code - 0x2f800]);
        }
        return false;
    };

    var stringFromCodePoint = function(codeNum) {
        var cp = codeNum - 0x10000;
        var high = 0xD800 | (cp >> 10);
        var low = 0xDC00 | (cp & 0x3FF);
        return String.fromCharCode(high, low);
    };


    // Dxxxxx.xを整形する
    var dkwformat = function(dkw) {
        var dp = dkw.substr(1).toLowerCase().split(".");
        var is_hokan = (dp[0][0] == "h");
        return (is_hokan ? "補" : "")
            + parseInt(is_hokan ? dp[0].substr(1) : dp[0], 10)
            + ("'".repeat(dp[1] * 1));
    };
    
    // ページャを表示する
    var pager = function(start, end, $li, is_hokan) {
        var st = parseInt(start / PER) * PER;
        for(var i = st; i < end; i += PER) {
            var p = parseInt(i / 100);
            if (is_hokan) p += "h";
            $("<a>").text(p).attr("href", "#" + p).appendTo($li);
            $li.append(" ");
        }
        $("#pager a").click(function() {
            var str = $(this).attr("href").split("#").pop();
            redraw(str);
        });
    };

    //リストを表示する
    var drawlist = {
        //異体字セレクタ分離
        "vs": function($list) {

            // UCS統合テーブルの作成
            var ret = {};
            var inclvs = [];
            Object.keys(ucs).sort().forEach(function(dkw) {
                var code = ucs[dkw][0];
                if (!code || code == "D") return;
                var is_vs = (code.match(/\uDB40[\uDD00-\uDdeF]/) || is_cjkcompat(code));

                // 統合漢字表現に統一する
                var ucode = is_cjkcompat(code) || code.replace(/\uDB40[\uDD00-\uDdeF]/g, "");

                var d = dkwformat(dkw);
                if (ret[ucode])
                    ret[ucode].push(dkw);
                else
                    ret[ucode] = [dkw];

                if (ucode != code) inclvs.push(ucode);
            });

            inclvs = inclvs.filter((c, i, self) => (self.indexOf(c) == i));
            //console.log(inclivs);
            
            // 結果表示
            ["vs", "vs0"].forEach(function(name) {
                var id = "content_" + name;
                var $list = $("#" + id);
                if ($list.length == 0)
                    $list = $("<div>").attr("id", id).addClass("content").appendTo("#list").hide();
                
                inclvs.forEach(function(ucode) {
                    if (name == "vs" && ret[ucode].length == 1) return;
                    if (name == "vs0" && ret[ucode].length != 1) return;
                    var $group = $("<div>").appendTo($list).css("padding", "0");
                    ret[ucode].forEach(function(dkw) {
                        var $div = $("<div>").appendTo($group).css("border", "none");
                        show_cell(dkw, $div, false);
                    });
                });
                $list.append("[" + $list.find("span.c").size() + "]<br/>");
            });
            $list.show();
        },

        //欠番
        "missing": function($list) {
            $list.text(missing.map(d => dkwformat(d)).join(", ") + " [" + missing.length + "]");
        },

        //統合
        "unified": function($list) {
            var ret = {};
            Object.keys(ucs).sort().forEach(function(dkw) {
                var code = ucs[dkw][0];
                if (!code || code == "D") return;
                code = code.split("*").join("");
                var d = dkw; //dkwformat(dkw);
                if (ret[code])
                    ret[code].push(d);
                else
                    ret[code] = [d];
            });
            Object.keys(ret).sort().forEach(function(code) {
                if (ret[code].length < 2) return;

                var $group = $("<div>").appendTo($list).css("padding", "0");
                ret[code].forEach(function(dkw) {
                    var $div = $("<div>").appendTo($group).css("border", "none");
                    show_cell(dkw, $div, false);
                });
                
                if (0) {
                    var $td = $("<div>").appendTo($list);
                    $("<span>").addClass("h").appendTo($td).html(code);
                    $("<span>").appendTo($td).html(ret[code].join("<br />")).addClass("c");
                    //$list.append("<span class=k>" + code + "</span><span class=c>" + ret[code].join("<br>") + "</span></div>");
                }
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
        // UCS未定義
        "undefined": function($list) {
            Object.keys(ucs).forEach(function(dkw) {
                var code = ucs[dkw][0];
                if (code || code == undefined) return;
                show_cell(dkw, $("<div>").addClass("cell").appendTo($list));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
        "undefvs": function($list) {
            Object.keys(ucs).sort().forEach(function(dkw) {
                if (typeof(ucs[dkw]) !== "object") return;
                if (!ucs[dkw].some(u => u.match(/\*$/))) return;
                show_cell(dkw, $("<div>").addClass("cell").appendTo($list));
            });
            $list.append("[" + $list.find(".c").size() + "]");
        },
        // 重複文字
        "duplicated": function($list) {
            Object.keys(ucs).sort().forEach(function(dkw) {
                var code = ucs[dkw][0];
                if (code.indexOf("D") != 0) return;
                var $cell = $("<div>").appendTo($list);
                show_cell(code, $cell);
                $cell.find(".c").append("<br>" + dkwformat(dkw));
            });
            $list.append("[" + $list.find("span.c").size() + "]");
        },
    
        // 複数通りのUCS表現
        "multiple" : function($list) {
            Object.keys(ucs).sort().forEach(function(dkw) {
                if (ucs[dkw].length < 2 || ucs[dkw][0][0] == "D") return;
                // 統合漢字表現ですべて同じ場合は表示しない
                if (ucs[dkw].map(u => is_cjkcompat(u) || u.replace(/\*|\uDB40[\uDD00-\uDdeF]/g, ""))
                    .filter((c, i, self) => (self.indexOf(c) == i)).length == 1) return;

                show_cell(dkw, $("<div>").appendTo($list), true);
            });
            $list.append("[" + $list.find("span.c").size() + "]");
        },
        // ダッシュ
        "dash": function($list) {
            Object.keys(ucs).sort().forEach(function(dkw) {
                var d = parseInt(dkw.split(".").pop());
                if (d != 0)
                    show_cell(dkw, $("<div>").appendTo($list));
            });
            $list.append("[" + $list.find("span.c").size() + "]");
        },
    };
    drawlist.vs0 = drawlist.vs;
    
    $("#listmenu span").click(function() {
        if ($(this).hasClass("selected")) return;
        $(this).siblings().removeClass("selected");
        $(this).addClass("selected");
        $("#list .content").hide();
        var name = $(this).attr("id");
        var id = "content_" + name;
        if ($("#" + id).length > 0) {
            $("#" + id).show();
            return;
        }
        drawlist[name]($("<div>").attr("id", id).addClass("content").appendTo("#list"));
        set_cell_clickevents();

    });

    $("#searchbar").change(function() {
        var str = $(this).val();
        if (!str) return;

        //$("#list .content").hide();
        $("#listmenu span").removeClass("selected");
        $("#searchres").text("");

        Array.from(str).forEach(function(c) {
            Object.keys(ucs).filter(key => ucs[key].toString().indexOf(c) != -1).forEach(function(dkw) {
                var $div = $("<div>").appendTo("#searchres");
                show_cell(dkw, $div, true);
            });
        });
    });
    
    var $li = $("#pager");
    pager(1, 50000, $li);
    pager(1, 805, $li, true);

});
