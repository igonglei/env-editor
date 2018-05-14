$(function() {
    var plugObj = EnvEditor.Init();
});

if ($.fn.showLoader) {
    $.extend($.fn.showLoader.defaults, {
        color: "#3c8ad8",
        backgroundColor: "rgba(255,255,255,0.6)"
    });
}

var plugPath = "static/plugins/envEditor/",
    imgPath = plugPath + "images/",
    dataPath = plugPath + "data/";

//环境编辑器测试
var EnvEditor = new function() {
    //插件对象
    this.PlugObj = {};
    //编辑器初始化
    this.Init = function(option) {
        var plugObj = new EPlug();
        plugObj.Init("EPlug_Contain", option);
        this.BindEvent(plugObj);
        this.PlugObj = plugObj;
        return plugObj;
    };
    //事件绑定
    this.BindEvent = function(plugObj) {
        //查看环境图形的文本内容
        $(".spanEditorViewText").off("click").click(function() {
            plugObj.ViewText();
        });
        //topolimit显示、隐藏
        $(".spanEditorTopolimit").off("click").click(function() {
            $(".EPlugTopolimitSubmit").off("click").click(function() {
                var topolimit_content = $("#txtTopoLimit").val();
                var arr_topolimit = {
                    BigType: EnxHelper.ModelType.Topolimit,
                    Name: topolimit_content
                };
                var flag = false;
                $.each(plugObj.Property.DataList, function(index, value) {
                    if (value.BigType == EnxHelper.ModelType.Topolimit) {
                        value.Name = topolimit_content;
                        flag = true;
                    }
                });
                if (!flag) {
                    plugObj.Property.DataList.push(arr_topolimit);
                }
                $("#modalTopolimit").modal("hide");
            });
            $(".EPlugTopolimitClose").off("click").click(function() {
                $("#modalTopolimit").modal("hide");
            });
            $("#txtTopoLimit").val("");
            $("#modalTopolimit").modal();
        });
        //导入窗口显示控制
        $(".spanEditorBtnOpenEnx").off("click").click(function() {
            var $modal = $("#modalOpenEnx");
            $(".EPlugImportSubmit").off("click").click(function() {
                var enxContent = $(".EPlugEnxInput").val();
                var fileName = $("#EPlugImportBtn").val();
                plugObj.Property.FileName = fileName.substr(fileName.lastIndexOf("\\") + 1);
                var lst = EnxHelper.EnxToLstJson(enxContent);
                plugObj.SetData(lst);
                ////查看转换后的数据结构 （后期删除）
                var afterTranRes = "";
                $.each(lst, function(index, json) {
                    afterTranRes += JSON.stringify(json) + "\n\r";
                });
                $(".EPlugEnxInput").val(afterTranRes);
                ////查看转换后的数据结构
                $modal.modal("hide");
            });
            $(".EPlugImportClose").off("click").click(function() {
                $modal.modal("hide");
            });
            $("#EPlugImportBtn").val("");
            $(".EPlugEnxInput").val("");
            $modal.modal();
        });
        //保存环境至数据库
        $(".spanEditorBtnSaveEnx").off("click").click(function() {
            plugObj.SaveData(true);
        });
        //导入本地enx文件按钮
        $("#EPlugImportBtn").off("change").change(function() {
            if (this.files) {
                var file = this.files[0];
                var reader = new FileReader();
                reader.readAsText(file, "UTF-8");
                reader.onload = function(e) {
                    var fileText = e.target.result;
                    $(".EPlugEnxInput").val(fileText);
                };
            }
        });
        //导出enx文件按钮
        $(".spanEditorBtnExportEnx").off("click").click(function() {
            plugObj.ExportFile();
        });
        // tooltip
        $('[data-toggle="tooltip"]').tooltip();
        // right panel toggle
        $(".EplugGraphRightToggle").on("click", function() {
            EnvEditor.toggleRightContainer($(this).hasClass("left"));
        });
    };
    this.toggleRightContainer = function(state) {
        var $to = $(".EplugGraphRightToggle"),
            $rp = $(".EplugGraphEditorResource"),
            $co = $(".EplugGraphEditorRightContainer"),
            $tn = $(".EplugGraphEditorRightTop"),
            rpWidth = 560,
            toWidth = $to.outerWidth(),
            diff = rpWidth - toWidth,
            leftCls = "left",
            isClosed = $to.hasClass(leftCls),
            toggle = function(width, func, title, exp, display) {
                $co.css({
                    "padding-right": exp + diff
                });
                $rp.css("width", width);
                $tn.css("display", display);
                $to[func](leftCls).attr("title", title);
            };
        if (state) {
            if (isClosed) {
                toggle(rpWidth, "removeClass", "Close", "+=", "block");
            }
        } else {
            if (!isClosed) {
                toggle(toWidth, "addClass", "Open", "-=", "none");
            }
        }
    };
}();

//插件
function EPlug() {
    //对象本身
    var Me = this;
    //对象的自定义属性
    this.Property = new function() {
        this.ERRCODE_SUCCESS = "0x0000";
        //组网的整个数据
        this.DataList = [];
        //设备数据
        this.LstNodeJson = [];
        //链路数据
        this.LstLinkJson = [];
        //已经占用的端口
        this.BusyPortId = [];
        //端口数据
        this.LstPortJson = [];
        //容器元素ID
        this.ElementId = "";
        //容器元素的jquery包装
        this.Element = {};
        //选中的模型类型
        this.SelectModelType = EnxHelper.ModelType.Ne;
        //当前登录的用户
        this.CurrentUser = "";
        //默认PDU为SYSTEM
        this.DefaultPDU = "SYSTEM";
        this.CurrentPDU = this.DefaultPDU;
        //webservices服务后缀名
        this.WebsvcSuffix = ".asmx";
        //enx文件格式
        this.FileAfter = ".enx";
        //组网的id
        this.EnxId = EnxHelper.CreateNewGuid();
        //发送请求的地址
        this.PostUrl = new function() {
            //根据ID获取
            this.GetById = "";
            //根据ID更新
            this.UpdateById = "";
        }();
        //图形化插件对象
        this.GraphPlug = {};
        //当前组网节点
        this.TopoNode = {};
        //网络平面数据
        this.NetworkJson = [];
        //select选项值
        this.SelectOptionValues = {
            vmFlag: ["", "Fenix_GTR_4U4G100G_01", "Fenix_vNE_sFTP_Tester_8U8G90G_01"],
            network: ["", "Base1", "Base2", "Fabric1", "Fabric2", "OM", "External1", "External2", "External3", "External4", "External5", "External6", "ExternalN"],
            internal_external: ["", "InternalPort", "ExternalPort"],
            virtual_real: ["Virtual", "Real"]
        };
        //文件名称。
        this.FileName = "";
        //测试床名称
        this.ArrTestBedName = [];
    }();
    //设置插件的列表的值，并且把设备和链路的先查出来，后面性能好点
    this.SetData = function(lstData) {
        //重置常量，这个后期应该移到变量里面
        this.ConstInfo.Reset();
        this.Property.DataList = lstData;
        this.Property.TopoNode = JsonHelper.GetJsonByKey(lstData, EnxHelper.Field.BigType, EnxHelper.ModelType.Env);
        this.Property.LstNodeJson = JsonHelper.FilterListByValues(lstData, EnxHelper.Field.IsTopDevice, [EnxConstField.BoolStr.Yes]);
        this.Property.LstLinkJson = JsonHelper.FilterListByValues(lstData, EnxHelper.Field.BigType, [EnxHelper.ModelType.Link]);
        //占用的端口处理
        Me.Property.BusyPortId = [];
        $.each(Me.Property.LstLinkJson, function(index, linkNode) {
            var sourcePortId = JsonHelper.GetStrValue(linkNode[EnxConstField.AttrName.ENXFILE_ATTR_SOURCEDEVICEID], EnxConstField.AttrName.ENXFILE_ATTR_VALUE);
            var targetPortId = JsonHelper.GetStrValue(linkNode[EnxConstField.AttrName.ENXFILE_ATTR_TARGETDEVICEID], EnxConstField.AttrName.ENXFILE_ATTR_VALUE);
            Me.Property.BusyPortId.push(sourcePortId);
            Me.Property.BusyPortId.push(targetPortId);
        });
        this.Property.LstPortJson = JsonHelper.FilterListByValues(lstData, EnxHelper.Field.BigType, [EnxHelper.ModelType.Port]);
        //初始化图形
        this.GraphEditor.Init();
    };
    //获取名称的缓存列表
    this.GetObjectNameCache = function() {
        var objnameDicId = {};
        if (Me.Property.DataList && Me.Property.DataList.length > 0) {
            $(Me.Property.DataList).each(function(index, value) {
                var objName = JsonHelper.GetJsonValue(JsonHelper.GetJsonValue(value, EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME), EnxConstField.AttrName.ENXFILE_ATTR_VALUE);
                var id = value[EnxHelper.Field.ID];
                objnameDicId[objName] = id;
            });
        }
        return objnameDicId;
    };
    //初始化插件
    this.Init = function(option) {
        //解析地址栏参数
        var pdu = EnxHelper.GetQueryString(Me.ConstInfo.QueryStringParam.pdu);
        var user = EnxHelper.GetQueryString(Me.ConstInfo.QueryStringParam.user);
        var enxId = EnxHelper.GetQueryString(Me.ConstInfo.QueryStringParam.enxId);
        Me.Property.CurrentPDU = pdu || Me.Property.DefaultPDU;
        var postHost = Me.PduRelUrl[Me.Property.CurrentPDU] || Me.PduRelUrl[Me.Property.DefaultPDU];
        //判断是否是webservices
        if (postHost.indexOf(Me.Property.WebsvcSuffix) == -1) {
            Me.Property.PostUrl.GetById = postHost + Me.ConstInfo.QueryMethod.GetEnvContentByIdNew;
            Me.Property.PostUrl.UpdateById = postHost + Me.ConstInfo.QueryMethod.UpdateDataByIdNew;
        } else {
            Me.Property.PostUrl.GetById = postHost + Me.ConstInfo.QueryMethod.GetEnxContentById;
            Me.Property.PostUrl.UpdateById = postHost + Me.ConstInfo.QueryMethod.UpdateDataById;
        }
        if (user) {
            Me.Property.CurrentUser = user;
        }
        if (enxId) {
            Me.Property.EnxId = enxId;
            this.GetEnxContentByID(enxId);
        }
        Me.SetData([]);
        this.OptionParam = $.extend(this.OptionParam, option);
        this.loadLocalEnx("eca27c53-9fcb-e35a-5405-c75fe9325a15");
    };
    //加载本地enx文件
    this.loadLocalEnx = function(enxId) {
        var $content = $(".EplugGraphEditorRightContainer");
        $content.showLoader();
        $.get(dataPath + enxId + ".enx", function(data) {
            Me.SetData(EnxHelper.EnxToLstJson(data));
        }).always(function() {
            $content.hideLoader();
        });
    };
    //根据组网ID获取组网内容。区分webservices和restful两种接口
    this.GetEnxContentByID = function(enxId) {
        var lstEnxContent = [];
        var strEnxContent = "";
        var strUser = Me.Property.CurrentUser;
        //默认restful接口
        var reqType = "GET";
        var param = "";
        //webservices接口
        if (Me.Property.PostUrl.GetById.indexOf(Me.Property.WebsvcSuffix) == -1) {
            Me.Property.PostUrl.GetById = EnxHelper.Format(Me.Property.PostUrl.GetById, enxId);
        } else {
            reqType = "POST";
            param = JSON.stringify({
                user: strUser,
                enxId: enxId
            });
        }
        var service_addr = Me.Property.PostUrl.GetById;
        var req_content = param;
        var headerSet = JSON.stringify({
            "X-Auth-UserID": strUser
        });
        var $content = $(".EplugGraphEditorRightContainer");
        $content.showLoader();
        this.RequestService(reqType, service_addr, req_content, headerSet, function(res) {
            $content.hideLoader();
            var alertMsg = "";
            if (res && res.resMessage && res.errcode == Me.Property.ERRCODE_SUCCESS) {
                var data = JSON.parse(res.resMessage);
                if (Me.Property.PostUrl.GetById.indexOf(Me.Property.WebsvcSuffix) == -1) {
                    if (data && data.content) {
                        strEnxContent = data.content;
                        Me.Property.FileName = data.filename;
                        //设置topolimit
                        $("#txtTopoLimit").val(data.topolimit);
                    }
                } else {
                    if (data && data.d) {
                        var result = JSON.parse(data.d).result;
                        if (result) {
                            strEnxContent = result.enx;
                            Me.Property.FileName = result.filename;
                        }
                    }
                }
            } else {
                alertMsg = res.errcode;
            }
            if (alertMsg) {
                toastr.error(alertMsg);
            }
            if (strEnxContent) {
                lstEnxContent = EnxHelper.EnxToLstJson(strEnxContent);
            }
        }, function(XMLHttpRequest, textStatus, errorThrown) {
            $content.hideLoader();
            var errorMsg = XMLHttpRequest.statusText;
            if (Me.Property.PostUrl.GetById.indexOf(Me.Property.WebsvcSuffix) == -1 && XMLHttpRequest.responseText) {
                var errData = JSON.parse(XMLHttpRequest.responseText || "{}");
                errorMsg = errorMsg + "\r\n" + (errData.message || "");
            }
            toastr.error(errorMsg);
        }, function(msg) {
            Me.SetData(lstEnxContent);
        });
    };
    //获取当前enx内容
    this.GetEnxContent = function() {
        //1.获取位置信息
        $.each(Me.Property.LstNodeJson, function(index, value) {
            var id = value[EnxHelper.Field.ID];
            var bigType = value[EnxHelper.Field.BigType];
            var cell = Me.Property.GraphPlug.GetCellsByFieldValue(bigType, Me.Property.GraphPlug.ConstInfo.AttrName.ID, id);
            var positionJson = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_POSITION, Me.Property.GraphPlug.Translater.BondToString(cell));
            value[EnxConstField.AttrName.ENXFILE_ATTR_POSITION] = positionJson;
        });
        //2.列表解析成xml
        var xmlContent = EnxHelper.LstJsonToEnx(Me.Property.DataList);
        xmlContent = xmlContent.replace(new RegExp("&lt;", "gm"), "<").replace(new RegExp("&gt;", "gm"), ">").replace(new RegExp("★", "gm"), "&quot;").replace(new RegExp("♣", "gm"), "&amp;").replace(new RegExp("◀", "gm"), "&lt;").replace(new RegExp("▶", "gm"), "&gt;");
        return xmlContent;
    };
    //获取保存组网的post数据
    this.GetPostData = function() {
        var xmlContent = this.GetEnxContent();
        var strUser = Me.Property.CurrentUser;
        var topolimit = $("#txtTopoLimit").val();
        var objData = {};
        var fileName = Me.Property.FileName ? Me.Property.FileName : Me.Property.EnxId + Me.Property.FileAfter;
        if (Me.Property.PostUrl.UpdateById.indexOf(Me.Property.WebsvcSuffix) == -1) {
            objData = {
                id: Me.Property.EnxId,
                content: xmlContent,
                filename: fileName,
                userid: strUser,
                topolimit: topolimit,
                testbedname: "",
                testbedcontent: ""
            };
        } else {
            var imageUrl = Me.Property.GraphPlug.GetImageUrl();
            objData = {
                user: Me.Property.CurrentUser,
                enxId: Me.Property.EnxId,
                enxContent: xmlContent,
                enxImageUrl: imageUrl,
                fileName: fileName
            };
        }
        return objData;
    };
    //保存组网数据
    this.SaveData = function(isAlert) {
        var service_addr = Me.Property.PostUrl.UpdateById;
        var req_content = this.GetPostData();
        if (!req_content || !req_content.content) {
            return;
        }
        var headerSet = {
            "X-Auth-UserID": Me.Property.CurrentUser
        };
        //请求服务
        this.RequestService("POST", service_addr, JSON.stringify(req_content), JSON.stringify(headerSet), function(data) {
            var alertMsg = "";
            if (data && data.resMessage && data.errcode == Me.Property.ERRCODE_SUCCESS) {
                var res = JSON.parse(data.resMessage);
                if (Me.Property.PostUrl.UpdateById.indexOf(Me.Property.WebsvcSuffix) == -1) {
                    if (res.result && res.result == "success") {
                        Me.OpenNewUrl();
                        if (isAlert) {
                            toastr.success("Save successfully!");
                        }
                    } else {
                        alertMsg = res.message;
                    }
                } else {
                    var resAsmx = JSON.parse(res.d);
                    if (resAsmx.errcode) {
                        alertMsg = resAsmx.errcode;
                    }
                }
            } else {
                alertMsg = data.errcode;
            }
            if (isAlert && alertMsg) {
                toastr.error(alertMsg);
            }
        }, function(XMLHttpRequest, textStatus, errorThrown) {
            var errorMsg = XMLHttpRequest.statusText;
            if (Me.Property.PostUrl.UpdateById.indexOf(Me.Property.WebsvcSuffix) == -1 && XMLHttpRequest.responseText) {
                var errData = JSON.parse(XMLHttpRequest.responseText || "{}");
                errorMsg = errorMsg + "\r\n" + (errData.message || "");
            }
            if (isAlert && alertMsg) {
                toastr.error(errorMsg);
            }
        });
    };
    //请求服务
    this.RequestService = function(req_type, service_addr, req_content, headerSet, successFunc, errorFunc, completeFunc) {
        var formdata = new FormData();
        formdata.append("req_type", req_type);
        formdata.append("service_addr", service_addr);
        formdata.append("req_content", escape(req_content));
        formdata.append("headerSet", escape(headerSet));
        $.ajax({
            type: "POST",
            url: "/Home/RequestService",
            data: formdata,
            dataType: "json",
            processData: false,
            contentType: false,
            success: successFunc,
            error: errorFunc,
            complete: completeFunc
        });
    };
    //导出文件
    this.ExportFile = function() {
        xmlContent = this.GetEnxContent();
        var formdata = new FormData();
        formdata.append("user", Me.Property.CurrentUser);
        formdata.append("enxId", Me.Property.EnxId);
        formdata.append("enxContent", escape(xmlContent));
        $.ajax({
            type: "POST",
            url: "/Home/ExportEnxFile",
            data: formdata,
            dataType: "json",
            processData: false,
            contentType: false,
            success: function(data) {
                if (data && data.url) {
                    Me.OpenNewPage(data.url, undefined, true);
                }
                if (data && data.errcode) {
                    toastr.error(data.errcode);
                }
            }
        });
    };
    //查看图形文本内容
    this.ViewText = function() {
        xmlContent = this.GetEnxContent();
        var formdata = new FormData();
        formdata.append("enxId", Me.Property.EnxId);
        formdata.append("enxContent", escape(xmlContent));
        $.ajax({
            type: "POST",
            url: "/Home/ViewText",
            data: formdata,
            dataType: "json",
            processData: false,
            contentType: false,
            success: function(data) {
                if (data) {
                    $("#xmpViewText").text(data.content || data.errcode);
                }
                $("#modalViewText").modal();
            }
        });
    };
    //打开新页面
    this.OpenNewPage = function(url, parama, strNewOpen) {
        if (parama != undefined && typeof parama == "object") {
            var _param = $.param(parama);
            url = url + "?" + _param;
        }
        var _target = "_blank";
        if (strNewOpen != undefined) {
            _target = "_parent";
        }
        if ($.browser && $.browser.mozilla) {
            window.location = url;
        } else {
            var oA = document.createElement("a");
            oA.href = url;
            oA.target = _target;
            oA.style.display = "none";
            document.body.appendChild(oA);
            oA.click();
            document.body.removeChild(oA);
        }
    };
    //打开新地址
    this.OpenNewUrl = function() {
        var fileName = Me.Property.EnxId;
        var url = window.location.host;
        var search = window.location.search.substr(1);
        var param = [];
        var enxID = Me.ConstInfo.QueryStringParam.enxId;
        var newSearch = enxID + "=" + fileName;
        if (search) {
            param = search.split("&");
            if (search.indexOf(enxID) < 0) {
                param.push(newSearch);
            } else {
                for (var i = 0; i < param.length; i++) {
                    if (param[i].indexOf(enxID) >= 0) {
                        param[i] = newSearch;
                        break;
                    }
                }
            }
            newSearch = param.join("&");
        }
        window.location.search = newSearch;
    };
    //获取元素
    this.GetElement = function(seletor) {
        return this.Property.Element.find(seletor);
    };
    //Html信息编辑（关于信息的编辑）[列表编辑]
    this.HtmlEditor = new function() {
        //获取构造表格的信息 isDefault :表示默认的
        this.GetModelField = function(type, isDefault) {
            var res = Me.ConstInfo.AvailableFiled[type];
            if (Me.ConstInfo.IsFirstInitAvailField[type] && !isDefault) {
                return this.InitAvailField(type);
            }
            return res;
        };
        //获取json节点的有效字段 (此时有效字段为空)
        this.InitAvailField = function(type) {
            var unAvailField = this.GetModelUnAvailField(type);
            var availField = this.GetModelField(type, true);
            var json = this.GetFirstModelEntity(type);
            var userDefineKeys = JsonHelper.GetJsonAllValue(EnxHelper.Field);
            Me.ConstInfo.IsFirstInitAvailField[type] = false;
            var isJosonObj = JsonHelper.IsJsonObj(json);
            var fieldName;
            for (var key in json) {
                if (isJosonObj) {
                    fieldName = key;
                } else {
                    fieldName = json[key];
                }
                if (typeof fieldName == "string" && userDefineKeys.indexOf(fieldName) < 0 && unAvailField.indexOf(fieldName) < 0) {
                    availField.push(fieldName);
                }
            }
            return availField;
        };
        //获取构造表格的信息
        this.GetFirstModelEntity = function(type) {
            var res = Me.ConstInfo.DefaultAvailField[type];
            return res;
        };
        //获取构造表格的信息
        this.GetModelUnAvailField = function(type) {
            return Me.ConstInfo.UnAvailableFiled[type];
        };
    }();
    //绘图插件
    this.GraphEditor = new function() {
        this.Init = function() {
            if (JsonHelper.IsEmptyJson(Me.Property.GraphPlug)) {
                Me.Property.GraphPlug = new GraphHelper(Me);
            } else {
                Me.Property.GraphPlug.ClearChildren();
                Me.Property.GraphPlug.RenderData();
            }
        };
    }();
    //配置参数
    this.OptionParam = {};
    //pdu对应的url (后期放入数据库)
    this.PduRelUrl = {
        SYSTEM: "http://superlab.huawei.com:7996/",
        SYSTEM_TEST: "http://localhost:50038/"
    };
    //获取特别字段，主要是链路中的端口id
    this.GetSpecialField = function(type) {
        var specialPortField = [];
        if (type == EnxHelper.ModelType.Link) {
            specialPortField = JsonHelper.GetJsonAllKey(Me.ConstInfo.SpecialFieldDic);
        }
        return specialPortField;
    };
    //获取字段的显示名称
    this.GetDisplayFieldName = function(fieldName) {
        var displayFieldName = fieldName;
        if (Me.ConstInfo.SpecialFieldDic[fieldName]) {
            displayFieldName = Me.ConstInfo.SpecialFieldDic[fieldName];
        }
        return displayFieldName;
    };
    //常量信息
    this.ConstInfo = new function() {
        //重置部分常量（后期这些变化的数据还是放入变量中）
        this.Reset = function() {
            //重置字段信息
            this.IsFirstInitAvailField.Ne = true;
            this.IsFirstInitAvailField.Tester = true;
            this.IsFirstInitAvailField.Dev = true;
            this.IsFirstInitAvailField.Atm = true;
            this.IsFirstInitAvailField.Sdh = true;
            this.IsFirstInitAvailField.Eth = true;
            this.IsFirstInitAvailField.Board = true;
            this.IsFirstInitAvailField.SubBoard = true;
            this.IsFirstInitAvailField.Link = true;
            this.IsFirstInitAvailField.Port = true;
            this.IsFirstInitAvailField.Network = true;
            this.IsFirstInitAvailField.Sftp = true;
            this.IsFirstInitAvailField.Agent = true;
            this.IsFirstInitAvailField.VM = true;
            this.AvailableFiled.Ne = ["roler"];
            this.Sdh = [];
            this.Atm = [];
            this.Eth = [];
            this.Tester = [];
            this.Dev = [];
            this.AvailableFiled.Board = [];
            this.AvailableFiled.SubBoard = [];
            this.AvailableFiled.Link = [];
            this.AvailableFiled.Port = [];
            this.Network = [];
            this.Sftp = [];
            this.Agent = [];
            this.AvailableFiled.VM = [];
        };
        //ip的正则表达式
        this.REG_IP = new RegExp(/^((25[0-5]|2[0-4]\d|[01]?\d\d?)($|(?!\.$)\.)){4}$/);
        //ip输入框
        this.IPINPUTCLASS = "EplugIpInput";
        //非正确的ip
        this.IPINPUTINCORRECTCLASS = "EplugIpInputIncorrect";
        //不正确的文本提示
        this.IPINPUTINCORRECTTIP = "Incorrect:";
        //表格的勾选ID
        this.TableDataCheckId = "data-checkIds";
        //ID选择器标识
        this.IDSelectorSingal = "#";
        //CLASS选择器标识
        this.ClassSelectorSingal = ".";
        //是否首次初始化
        this.IsFirstInitAvailField = new function() {
            this.Ne = true, this.Sdh = true, this.Atm = true, this.Eth = true, this.Tester = true,
                this.Dev = true, this.Board = true, this.SubBoard = true, this.Link = true, this.Port = true,
                this.Network = true, this.Sftp = true, this.Agent = true, this.VM = true;
        }();
        //有效的字段：表示可以通过列表展示，并且可以编辑的。  比如位置信息、guid等这些隐藏信息或者在图形化中编辑的字段不纳入进来；
        this.AvailableFiled = new function() {
            this.Ne = ["roler"], this.Sdh = [], this.Atm = [], this.Eth = [], this.Tester = [],
                this.Dev = [], this.Board = [], this.SubBoard = [], this.Link = [], this.Port = [],
                this.Network = [], this.Sftp = [], this.Agent = [], this.VM = [];
        }();
        //默认的有效字段 (主要用于初始化模型用)
        this.DefaultAvailField = new function() {
            //通用有效字段
            this.CommonAvailField = ["objname", "name", "ip", "type", "version", "alias", "caption", "is_topo", "remark"];
            //网元的有效字段
            //port: 设备端口号
            //cmts_port: 从框SN编码
            //cmts_type: 从框信道类型
            //olt_version: OLT类型
            //sub_ip: 从框IP
            this.Ne = this.CommonAvailField.concat(["id", "console", "mask", "username", "password", "ptp", "vender", "virtual_real", "port", "cmts_port", "cmts_type", "olt_version", "sub_ip"]);
            //Atm的有效字段
            this.Atm = this.CommonAvailField;
            //Sdh的有效字段
            this.Sdh = this.CommonAvailField;
            //Eth的有效字段
            this.Eth = this.CommonAvailField.concat(["actor", "bid", "sbid", "pid", "connect_type", "engrossstate", "groupip", "id", "mac", "username", "password", "port", "portnum", "ptp", "realNEId", "realtype", "submask", "vender"]);
            //单板的有效字段
            this.Board = this.CommonAvailField.concat(["angle", "bid", "engrossstate", "username", "password", "portnum", "realNEId", "slot", "virtual_real"]);
            //子卡的有效字段
            this.SubBoard = this.CommonAvailField.concat(["bid", "sbid", "engrossstate", "username", "password", "portnum", "realNEId", "submask", "virtual_real"]);
            //链路的有效字段
            this.Link = this.CommonAvailField.concat(["sourcetopdevicename", "sourcedeviceid", "targettopdevicename", "targetdeviceid", "connect_type", "direction", "parent", "cidr", "start_ip", "end_ip"]);
            //端口/网卡的有效字段 //(internal_external：内联端口/外联端口)
            this.Port = this.CommonAvailField.concat(["bid", "sbid", "pid", "shape", "submask", "interface", "host_id", "internal_external", "virtual_real"]);
            //Network网络平面的有效字段
            //cidr(Classless Inter-Domain Routing):IP地址段，如果不指定则由云平台分配； start_ip:allocation_pools启始IP； end_ip:allocation_pools结束IP。start、end必须在所属cidr范围内
            this.Network = this.CommonAvailField.concat(["cidr", "start_ip", "end_ip"]);
            //VM的有效字段[vmFlag: 配置标识;配置标识 下拉选择，然后CPU内存 和镜像 改成自动显示 不可修改的 用户选择好 配置标识以后 他们两个自动显示出来]
            this.VM = this.CommonAvailField.concat(["username", "password", "vmFlag", "cpu_memory", "hardDisk", "mirror", "virtual_real"]);
            //Sftp的有效字段
            this.Sftp = this.VM;
            //执行机的有效字段
            this.Agent = this.VM;
            //Tester的有效字段
            this.Tester = this.VM;
            this.Dev = this.VM;
        }();
        //无效的字段
        this.UnAvailableFiled = new function() {
            //通用无效字段
            this.CommonUnAvailField = ["name", "guid", "shape", "position", "class", "fullclass"];
            //网元不显示的字段
            this.Ne = this.CommonUnAvailField.concat(["id", "bid", "connect_type", "mac", "pid", "port", "portnum"]);
            //Tester不显示的字段
            this.Tester = this.CommonUnAvailField;
            this.Dev = this.CommonUnAvailField;
            //Sdh不显示的字段
            this.Sdh = this.CommonUnAvailField;
            //Atm不显示的字段
            this.Atm = this.CommonUnAvailField;
            //Eth不显示的字段
            this.Eth = this.CommonUnAvailField;
            //单板不显示的字段
            this.Board = this.CommonUnAvailField;
            //子卡不显示的字段
            this.SubBoard = this.CommonUnAvailField.concat(["bid"]);
            //链路不显示的字段
            this.Link = this.CommonUnAvailField.concat(["dst_port", "src_port"]);
            //端口不显示的字段
            this.Port = this.CommonUnAvailField;
            this.Network = this.CommonUnAvailField;
            this.Sftp = this.CommonUnAvailField;
            this.Agent = this.CommonUnAvailField;
            this.VM = this.CommonUnAvailField;
        }();
        //页面的最小大小
        this.MinPageSize = 10;
        //复选框列字段名称
        this.CheckBoxTDFieldName = "checkboxelem";
        //操作列字段名称
        this.OperationTDFieldName = "operationelem";
        //复合正则
        this.CombineRepalceSingal = "(0*\\[[1-9]\\d*\\-[1-9]\\d*\\]|0*[1-9]\\d*\\+|0*\\*)(\\([1-9]\\d*\\))?";
        //*:所有的数字替换符，1+；
        this.AllReplaceSingal = "\\*";
        //数字匹配
        this.NumberRegionSingal = "[1-9]\\d*";
        //占位符
        this.OccupiedPlace = "0+";
        //[2-7]:区间替换符，小于则取更新数据源的长度结束，比如只有3条数据，则递增区间是2-4；大于则循环取数，比如8条数据，则为2-7,2,3 ；
        this.RegionReplaceSingal = "\\[[1-9]\\d*\\-[1-9]\\d*\\]";
        //+增量符号
        this.NumAddSingal = "+";
        //2+:表示某个数字开始
        this.NumAddReplaceSingal = "[1-9]\\d*\\+";
        //匹配参数 全局换行
        this.RegGM = "gm";
        //增量的步长
        this.AddStep = "(\\([1-9]\\d*\\))";
        //自增的类型
        this.AddSelfType = {
            //有起始值的增加+5
            NumberAdd: "NumberAdd",
            //区间自增[2-9]
            Region: "Region",
            //自动自增*，从1开始
            AutoAdd: "AutoAdd"
        };
        //特殊字段对应的文本显示
        this.SpecialFieldDic = {
            //原端口
            sourcedeviceid: "src_port",
            //目标端口
            targetdeviceid: "dst_port"
        };
        //需要下拉框显示的字段
        this.SelectField = ["vmFlag", //配置标识 下拉选择，然后CPU内存 和镜像 改成自动显示 不可修改的 用户选择好 配置标识以后 他们两个自动显示出来
            "network", //网络平面。网卡/端口的属性
            "internal_external", //端口类型（内联端口/外联端口）
            "virtual_real"
        ]; //网元类型（虚拟网元/真实网元）
        //不能编辑的字段
        this.NoEditField = ["sourcetopdevicename", "targettopdevicename"];
        //不能编辑的列的class
        this.NoEditTdClass = "EPlugNoEditTd";
        //地址栏参数
        this.QueryStringParam = new function() {
            //pdu
            this.pdu = "pdu";
            //用户
            this.user = "user";
            //组网id
            this.enxId = "enxId";
        }();
        //需要后台提供的请求方法
        this.QueryMethod = new function() {
            //获取ENX
            this.GetEnxContentById = "GetEnxContentById";
            //获取enx内容-restful接口
            this.GetEnvContentByIdNew = "api/editor/v1/content/{0}";
            //更新Enx
            this.UpdateDataById = "UpdateEnxContent";
            this.UpdateDataByIdNew = "api/editor/v1/enx";
        }();
        //加重名标记
        this.RepeatedSingal = "(1)";
        //加重名标记
        this.RepeatedElemtClass = "EPlugRepeatName";
        //获取构建状态结果的定时对象
        this.TIME_INTERVAL = null;
    }();
    //节点设置属性
    this.SetNodeAttr = function(type, nodeId, fieldName, json) {
        var res = this.GetLstByModelType(type);
        for (var i = 0; i < res.length; i++) {
            var tempNodeId = res[i][EnxHelper.Field.ID];
            if (tempNodeId == nodeId) {
                res[i][fieldName] = json;
                break;
            }
        }
    };
    //节点设置属性
    this.DeleteNodeAttr = function(type, nodeId, fieldName) {
        var res = this.GetLstByModelType(type);
        for (var i = 0; i < res.length; i++) {
            var tempNodeId = res[i][EnxHelper.Field.ID];
            if (tempNodeId == nodeId) {
                delete res[i][fieldName];
                break;
            }
        }
    };
    //获取构造表格的信息
    this.GetLstByModelType = function(type) {
        var res = [];
        switch (type) {
            case EnxHelper.ModelType.Ne:
                res = Me.Property.LstNodeJson;
                break;

            case EnxHelper.ModelType.Link:
                res = Me.Property.LstLinkJson;
                break;

            case EnxHelper.ModelType.Port:
                res = Me.Property.LstPortJson;
                break;
        }
        return res;
    };
    //创建模型 (缓存数据添加)
    this.CreateModel = function(type, parentId, pareantName, parentType, id, jsonvalue) {
        //注意定位和父级信息 ParentGID FullClass在外面设置 ne有shape固定值，后续再加 ; 定位信息Me.GraphEditor.SubGraph.GetBond(type);
        var res = {};
        res[EnxHelper.Field.BigType] = type;
        if (!id) {
            id = EnxHelper.CreateNewGuid();
        }
        res[EnxHelper.Field.ID] = id;
        if (parentId) {
            res[EnxHelper.Field.ParentGID] = parentId;
        }
        var guidJson = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_GUID, id);
        res[EnxConstField.AttrName.ENXFILE_ATTR_GUID] = guidJson;
        var fields = Me.ConstInfo.DefaultAvailField[type];
        var curIndex = EnxHelper.GlobalVar.ElemntIndex[type];
        if (fields) {
            var selectField = Me.ConstInfo.SelectField;
            $.each(fields, function(index, field) {
                var fieldValue = "";
                if (field == EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME || field == EnxConstField.AttrName.ENXFILE_ATTR_NAME) {
                    fieldValue = Me.Property.GraphPlug.ConstInfo.ElemntNamePre[type] + curIndex;
                    //单板、子卡、端口
                    if (pareantName && (type == EnxHelper.ModelType.Board || type == EnxHelper.ModelType.SubBoard || type == EnxHelper.ModelType.Port || type == EnxHelper.ModelType.VM)) {
                        fieldValue = pareantName + EnxConstField.NameSeparate + fieldValue;
                    }
                }
                //下拉框的属性值默认取第一个
                if (selectField.indexOf(field) > -1) {
                    fieldValue = Me.Property.SelectOptionValues[field][0];
                }
                if (JsonHelper.IsJsonObj(jsonvalue) && jsonvalue[field]) {
                    fieldValue = jsonvalue[field];
                }
                var fieldJson = EnxHelper.AttrParameter(field, fieldValue);
                res[field] = fieldJson;
            });
        }
        EnxHelper.GlobalVar.ElemntIndex[type] = curIndex + 1;
        var parentClassPre = parentType ? parentType + EnxConstField.ClassSeparate : "";
        switch (type) {
            case EnxHelper.ModelType.Ne:
            case EnxHelper.ModelType.Sftp:
            case EnxHelper.ModelType.Agent:
                res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.Yes;
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, type);
                res[EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS, type);
                Me.Property.LstNodeJson.push(res);
                break;

            case EnxHelper.ModelType.Network:
                if (parentId && parentType != "Env") {
                    res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.No;
                } else {
                    //和网元平级显示的网络平面
                    res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.Yes;
                }
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, type);
                res[EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS, type);
                Me.Property.LstNodeJson.push(res);
                break;

            case EnxHelper.ModelType.Tester:
                res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.Yes;
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_TESTERTYPE);
                res[EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_TESTERTYPE);
                Me.Property.LstNodeJson.push(res);
                break;

            case EnxHelper.ModelType.Dev:
                res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.Yes;
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_DEVTYPE);
                res[EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_DEVTYPE);
                Me.Property.LstNodeJson.push(res);
                break;

            case EnxHelper.ModelType.Atm:
                res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.Yes;
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPEATM);
                res[EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPEATM);
                Me.Property.LstNodeJson.push(res);
                break;

            case EnxHelper.ModelType.Sdh:
                res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.Yes;
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPESDH);
                res[EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPESDH);
                Me.Property.LstNodeJson.push(res);
                break;

            case EnxHelper.ModelType.Eth:
                res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.Yes;
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPEETH);
                res[EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPEETH);
                Me.Property.LstNodeJson.push(res);
                break;

            case EnxHelper.ModelType.Link:
                res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.No;
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPECONNECT);
                Me.Property.LstLinkJson.push(res);
                break;

            case EnxHelper.ModelType.Board:
            case EnxHelper.ModelType.SubBoard:
            case EnxHelper.ModelType.VM:
                res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.No;
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, type);
                res[EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS, parentClassPre + type);

            case EnxHelper.ModelType.Port:
                res[EnxHelper.Field.IsTopDevice] = EnxConstField.BoolStr.No;
                res[EnxConstField.AttrName.ENXFILE_ATTR_CLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_CLASS, type);
                res[EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS] = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_FULLCLASS, parentClassPre + type);
                Me.Property.LstPortJson.push(res);
                break;
        }
        Me.Property.DataList.push(res);
        return res;
    };
    //复制数据原型 (ID,GUID,OBJNAME,NAME都需要改变)
    this.CopyModel = function(json, parentId, pareantName, isRecu) {
        var res = JSON.parse(JSON.stringify(json));
        var id = EnxHelper.CreateNewGuid();
        var oldId = res[EnxHelper.Field.ID];
        res[EnxHelper.Field.ID] = id;
        var type = res[EnxHelper.Field.BigType];
        if (parentId) {
            res[EnxHelper.Field.ParentGID] = parentId;
        }
        var guidJson = EnxHelper.AttrParameter(EnxConstField.AttrName.ENXFILE_ATTR_GUID, id);
        res[EnxConstField.AttrName.ENXFILE_ATTR_GUID] = guidJson;
        var fields = [EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME, EnxConstField.AttrName.ENXFILE_ATTR_NAME];
        var curIndex = EnxHelper.GlobalVar.ElemntIndex[type];
        var name = Me.Property.GraphPlug.ConstInfo.ElemntNamePre[type] + curIndex;
        $.each(fields, function(index, field) {
            var curName = name;
            //单板、子卡、端口
            if (pareantName && (type == EnxHelper.ModelType.Board || type == EnxHelper.ModelType.SubBoard || type == EnxHelper.ModelType.Port || type == EnxHelper.ModelType.VM)) {
                curName = pareantName + EnxConstField.NameSeparate + name;
            }
            res[field][EnxConstField.AttrName.ENXFILE_ATTR_VALUE] = curName;
        });
        EnxHelper.GlobalVar.ElemntIndex[type] = curIndex + 1;
        switch (type) {
            case EnxHelper.ModelType.Ne:
            case EnxHelper.ModelType.Tester:
            case EnxHelper.ModelType.Dev:
            case EnxHelper.ModelType.Atm:
            case EnxHelper.ModelType.Sdh:
            case EnxHelper.ModelType.Eth:
                Me.Property.LstNodeJson.push(res);
                break;

            case EnxHelper.ModelType.Link:
                Me.Property.LstLinkJson.push(res);
                break;

            case EnxHelper.ModelType.Port:
                Me.Property.LstPortJson.push(res);
                break;

            default:
                Me.Property.LstNodeJson.push(res);
                break;
        }
        Me.Property.DataList.push(res);
        //判断下是否有子节点，有的话，继续复制
        var childNode = JsonHelper.FilterListByValues(Me.Property.DataList, EnxHelper.Field.ParentGID, [oldId]);
        var returnResult = [res];
        $.each(childNode, function(index, jsonNode) {
            var tempResut = Me.CopyModel(jsonNode, id, name, isRecu);
            returnResult = returnResult.concat(tempResut);
        });
        return returnResult;
    };
    //根据端口ID获取链路
    this.GetLinkByPortId = function(portId) {
        var res = {};
        //一个端口只可能在一条链路上
        for (var i = 0; i < Me.Property.LstLinkJson.length; i++) {
            var linkItem = Me.Property.LstLinkJson[i];
            if (linkItem.sourcedeviceid.value == portId || linkItem.targetdeviceid.value == portId) {
                res = linkItem;
                break;
            }
        }
        return res;
    };
    //根据父级删除所有的子级 id isRecu
    this.RemoveModelByParentId = function(parentId, isRecu) {
        var childIds = this.RemoveModel(EnxHelper.Field.ParentGID, parentId);
        if (isRecu) {
            $.each(childIds, function(index, id) {
                Me.RemoveModelByParentId(id, isRecu);
            });
        }
    };
    //删除缓存数据 由于删除除了根据id，还有根据父级id的
    this.RemoveModel = function(fieldName, fieldValue) {
        var arrResJson = [];
        var removeId = [];
        $.each(Me.Property.DataList, function(index, value) {
            var fieldInfo = value[fieldName];
            //如果对应的字段是个对象，则取其值
            if (typeof fieldInfo == "object") {
                fieldInfo = JsonHelper.GetStrValue(fieldInfo, EnxConstField.AttrName.ENXFILE_ATTR_VALUE);
            }
            if (fieldInfo != fieldValue) {
                arrResJson.push(value);
            } else {
                Me.RemoveModelRelaHandler(value);
                removeId.push(JsonHelper.GetStrValue(value, EnxHelper.Field.ID));
            }
        });
        Me.Property.DataList = arrResJson;
        return removeId;
    };
    //删除分类的缓存数据 一般情况下在RemoveModel内部使用，主要用于删除某个分类的临时数据 (也就是説暂时只对于顶层设备、链路、端口的处理)
    //如果是端口，注意还有占用端口的清除；删除链路，还需要删除占用端口
    this.RemoveModelRelaHandler = function(json) {
        var id = json[EnxHelper.Field.ID];
        var type = json[EnxHelper.Field.BigType];
        switch (type) {
            case EnxHelper.ModelType.Ne:
            case EnxHelper.ModelType.Tester:
            case EnxHelper.ModelType.Dev:
            case EnxHelper.ModelType.Atm:
            case EnxHelper.ModelType.Sdh:
            case EnxHelper.ModelType.Eth:
                Me.Property.LstNodeJson = Me.JsonArrDelete(Me.Property.LstNodeJson, EnxHelper.Field.ID, id);
                break;

            case EnxHelper.ModelType.Link:
                Me.Property.LstLinkJson = Me.JsonArrDelete(Me.Property.LstLinkJson, EnxHelper.Field.ID, id);
                //删除链路，还需要删除占用端口
                var sourcePortId = JsonHelper.GetStrValue(json[EnxConstField.AttrName.ENXFILE_ATTR_SOURCEDEVICEID], EnxConstField.AttrName.ENXFILE_ATTR_VALUE);
                var targetPortId = JsonHelper.GetStrValue(json[EnxConstField.AttrName.ENXFILE_ATTR_TARGETDEVICEID], EnxConstField.AttrName.ENXFILE_ATTR_VALUE);
                Me.Property.BusyPortId.splice(Me.Property.BusyPortId.indexOf(sourcePortId), 1);
                Me.Property.BusyPortId.splice(Me.Property.BusyPortId.indexOf(targetPortId), 1);
                break;

            case EnxHelper.ModelType.Port:
                Me.Property.LstPortJson = Me.JsonArrDelete(Me.Property.LstPortJson, EnxHelper.Field.ID, id);
                var indexPort = Me.Property.BusyPortId.indexOf(id);
                if (indexPort > -1) {
                    //删除链路数据
                    var link = Me.GetLinkByPortId(id);
                    //删除端口对应的链路，删除链路的同时，会删除占用端口
                    Me.RemoveModel(EnxHelper.Field.ID, JsonHelper.GetStrValue(link, EnxHelper.Field.ID));
                }
                break;
        }
    };
    //获取节点的子节点缓存数据
    this.GetChildrens = function(parentId, isRecu) {
        var arrResJson = [];
        $.each(Me.Property.DataList, function(index, value) {
            var tempParentId = value[EnxHelper.Field.ParentGID];
            if (tempParentId == parentId) {
                arrResJson.push(value);
                if (isRecu) {
                    var tempChildren = Me.GetChildrens(value[EnxHelper.Field.ID], isRecu);
                    arrResJson = arrResJson.concat(tempChildren);
                }
            }
        });
        return arrResJson;
    };
    //删除json数组中的某个元素
    this.JsonArrDelete = function(arrJson, key, keyValue) {
        var arrResJson = [];
        $.each(arrJson, function(index, value) {
            var fieldInfo = value[key];
            //如果对应的字段是个对象，则取其值
            if (typeof fieldInfo == "object") {
                fieldInfo = JsonHelper.GetStrValue(fieldInfo, EnxConstField.AttrName.ENXFILE_ATTR_VALUE);
            }
            if (fieldInfo != keyValue) {
                arrResJson.push(value);
            }
        });
        return arrResJson;
    };
}

//绘制图形
var GraphHelper = function(edit) {
    var thisObj = this;
    //permission
    var currentCorePermission = null;
    //自定义属性
    this.Property = new function() {
        //核心绘图对象
        this.CoreGraph = {};
        //容器元素
        this.Contain = {};
        //选中的节点
        this.SelectedVertexId = [];
        //选中的连线
        this.SelectedLinkId = [];
        //分组的索引（公用）
        this.LinkGroupIndex = 1;
        //副画布；
        this.AssistantGraph = {};
        //编辑器对象
        this.Editor = {};
    }();
    //初始化函数
    this.Init = function() {
        if (!mxClient.isBrowserSupported()) {
            mxUtils.error("Browser is not supported!", 200, false);
        } else {
            //初始化主画布
            var dom = this.Property.Contain = document.getElementById("EplugGraphEditorContainer");
            var editor = this.Property.Editor = new mxEditor();
            var graph = this.Property.CoreGraph = editor.graph;
            graph.init(dom);
            this.BasicFixSet();
            this.RenderData();
            //菜单栏绑定事件
            this.BindEventForMenu();
            this.BindEvent();
            this.InitPopMenu();
            //初始化副画布
            this.SubGraph.Init();
            //初始化属性面板
            this.PropertyPanel.Init();
        }
    };
    //根据链路id对链路作分组
    this.GroupLink = function(lstlinkId) {
        var allLink = this.GetAllLink(thisObj.Property.CoreGraph);
        //选择的链路
        var selectLinks = JsonHelper.FilterListByValues(allLink, this.ConstInfo.AttrName.ID, lstlinkId);
        //已经处理的链路
        var hasDealLinksId = [];
        $.each(selectLinks, function(index, link) {
            if (hasDealLinksId.indexOf(link.id) < 0) {
                hasDealLinksId.push(link.id);
                var sourceDeviceId = link.source.id;
                var targetDeviceId = link.target.id;
                var sameDoublePoint = [];
                var isGrouped = link.group && link.data.group.groupshow;
                $.each(selectLinks, function(index, tempLink) {
                    if (tempLink.id != link.id && (tempLink.source.id == sourceDeviceId && tempLink.target.id == targetDeviceId || tempLink.target.id == sourceDeviceId && tempLink.source.id == targetDeviceId)) {
                        isGrouped = isGrouped || tempLink.group && tempLink.data.group.groupshow;
                        sameDoublePoint.push(tempLink);
                        hasDealLinksId.push(tempLink.id);
                    }
                });
                //先判断下，如果本身是基线，或者同源端点中有基线，则不用执行分组了
                if (!isGrouped) {
                    thisObj.CombineLinkToGroup(link, sameDoublePoint, false);
                }
            }
        });
    };
    //子画布
    this.SubGraph = new function() {
        //子画布对象
        this.Graph = {};
        //子画布容器
        this.Container = {};
        //当前编辑的元素
        this.EditGraphCell = {};
        //当前对象
        var SubGraphObj = this;
        var currentPermission = null;
        //初始化
        this.Init = function() {
            SubGraphObj.Container = document.getElementById("EplugGraphEditorSubEditor");
            SubGraphObj.Graph = new mxGraph(this.Container);
            SubGraphObj.BasicFixSet();
            SubGraphObj.BindEvent();
            SubGraphObj.ConfigureStylesheet();
            SubGraphObj.InitPopMenu();
            var oldMovable = SubGraphObj.Graph.isCellMovable;
            SubGraphObj.Graph.isCellMovable = function(cell) {
                return oldMovable.apply(this, arguments) && currentPermission.canMoveVertet;
            };
            var oldSelectable = SubGraphObj.Graph.isCellSelectable;
            SubGraphObj.Graph.isCellSelectable = function(cell) {
                //链路编辑界面不能选中节点
                if (SubGraphObj.EditGraphCell && SubGraphObj.EditGraphCell.edge && !currentPermission.canSelectNode && cell.vertex) {
                    return false;
                }
                return oldSelectable.apply(this, arguments);
            };
        };
        //固定设置
        this.BasicFixSet = function() {
            //不让调整大小
            this.Graph.cellsResizable = false;
            mxConstants.ENTITY_SEGMENT = 20;
            //可以编辑
            this.Graph.cellsEditable = false;
            //链路无法移动
            this.Graph.edgeLabelsMovable = false;
            //只让节点连线
            this.Graph.allowDanglingEdges = false;
            //自身连接
            this.Graph.allowLoops = false;
            //可以连线
            this.Graph.setConnectable(true);
            //支持拖入
            this.Graph.setDropEnabled(true);
            this.Graph.setTooltips(true);
            this.Graph.getTooltipForCell = function(cell) {
                return cell.objname ? cell.objname : cell.value;
            };
            this.Graph.collapseToPreferredSize = false;
            this.Graph.constrainChildren = false;
            this.Graph.cellsSelectable = true;
            this.Graph.extendParentsOnAdd = false;
            this.Graph.extendParents = false;
            this.Graph.border = 10;
            this.Graph.keepEdgesInForeground = true;
            //堆栈布局
            var layout = new mxStackLayout(this.Graph, true);
            layout.border = this.Graph.border;
            layout.marginBottom = -10;
            var layoutMgr = new mxLayoutManager(this.Graph);
            layoutMgr.getLayout = function(cell) {
                if (!cell.collapsed) {
                    if (cell.parent != SubGraphObj.Graph.model.root) {
                        layout.resizeParent = true;
                        layout.horizontal = false;
                        layout.spacing = 10;
                        layout.x0 = 15;
                    } else {
                        layout.resizeParent = true;
                        layout.horizontal = true;
                        layout.spacing = 120;
                        layout.x0 = 0;
                    }
                    return layout;
                }
                return null;
            };
            //设置对象选中状态的颜色、线宽
            mxConstants.VERTEX_SELECTION_COLOR = "#87CEEB";
            // 浅蓝色
            mxConstants.VERTEX_SELECTION_STROKEWIDTH = 1.3;
            // 2像素
            mxConstants.VERTEX_SELECTION_DASHED = false;
            //不要虚线
            mxConstants.EDGE_SELECTION_STROKEWIDTH = 1.3;
            // 2像素
            mxConstants.HIGHLIGHT_STROKEWIDTH = 1.3;
            //禁用系统右键菜单
            mxEvent.disableContextMenu(this.Container);
            new mxCellTracker(this.Graph, "#87CEEB");
            //鼠标停留高亮元素
            mxConstants.DROP_TARGET_COLOR = "#87CEEB";
            mxConstants.CONNECT_HANDLE_FILLCOLOR = "#87CEEB";
            mxConstants.HANDLE_STROKECOLOR = "#87CEEB";
            //去锯齿效果
            mxRectangleShape.prototype.crisp = true;
            //引导线
            mxGraphHandler.prototype.guidesEnabled = true;
            mxGraph.prototype.expandedImage = null;
            mxGraph.prototype.collapsedImage = null;
            mxConnectionHandler.prototype.connectImage = new mxImage(imgPath + "arrow.png", 20, 20);
            this.Graph.htmlLabels = true;
            this.Graph.getLabel = function(cell) {
                var label = this.labelsVisible ? this.convertValueToString(cell) : "";
                if (cell.vertex) {
                    var arr = label.split("_");
                    return '<div class="subgraph-item-label label-' + cell.bigtype + " " + cell.using + '" data-id="' + cell.id + '">' + arr[arr.length - 1] + "</div>";
                }
                return label;
            };
        };
        //配置样式表
        this.ConfigureStylesheet = function() {
            //连线样式
            var lineStyle = {};
            lineStyle[mxConstants.STYLE_STROKECOLOR] = thisObj.ConstInfo.LineDefualtColor;
            lineStyle[mxConstants.STYLE_STROKEWIDTH] = 1.3;
            lineStyle[mxConstants.STYLE_FONTSTYLE] = 2;
            lineStyle[mxConstants.STYLE_PERIMETER_SPACING] = 0;
            lineStyle[mxConstants.STYLE_ENDARROW] = "";
            lineStyle[mxConstants.STYLE_FONTCOLOR] = "#5e698a";
            lineStyle[mxConstants.STYLE_FONTSIZE] = 12;
            lineStyle[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_BOTTOM;
            lineStyle[mxConstants.STYLE_EDGE] = mxConstants.EDGESTYLE_ENTITY_RELATION;
            lineStyle[mxConstants.STYLE_SEGMENT] = 0;
            this.Graph.getStylesheet().putCellStyle(EnxHelper.ModelType.Link, lineStyle);
        };
        //设置端口状态
        this.SetPortStatus = function(cell, canConnect) {
            SubGraphObj.Graph.getModel().beginUpdate();
            try {
                var style = canConnect ? thisObj.ConstInfo.SwimStyle : thisObj.ConstInfo.UsedPort;
                if (cell) {
                    cell.using = canConnect ? "" : "using";
                    SubGraphObj.Graph.getModel().setStyle(cell, style);
                    //网络平面可以连接多个端口，不是独占
                    SubGraphObj.SetCellConnectable(cell, canConnect);
                    if (this.EditGraphCell.vertex) {
                        //如果是编辑面板，一定不能连线
                        cell.setConnectable(false);
                    }
                }
            } finally {
                SubGraphObj.Graph.getModel().endUpdate();
            }
        };
        //设置链路的位置
        this.SetLoopLinkPosition = function(link) {
            SubGraphObj.Graph.getModel().beginUpdate();
            try {
                //如果是自连接，样式改变
                if (!link.geometry.points && link.data.sourcetopdevicename.value == link.data.targettopdevicename.value) {
                    link.geometry.points = [new mxPoint(310, 370)];
                }
            } finally {
                SubGraphObj.Graph.getModel().endUpdate();
            }
        };
        //应用权限
        this.ApplyPermission = function(permission) {
            currentPermission = permission;
        };
        //设置节点不能移动
        this.SetNodeCannotMove = function() {
            this.ApplyPermission(new Permission(false, false));
        };
        //重置可移动性
        this.ResetNodeMovable = function() {
            this.ApplyPermission(new Permission());
        };
        //编辑元素，
        this.EditCell = function(cell) {
            //重置可移动性
            SubGraphObj.ApplyPermission(new Permission());
            this.SetTopNav(cell && cell.data);
            //2清除模型
            this.Graph.getModel().clear();
            //缓存当前的绘制元素
            this.EditGraphCell = cell;
            if (cell && cell.vertex) {
                this.RenderNe(cell, true, undefined, false);
            } else if (cell && cell.edge) {
                this.InitLinkEditor(cell);
            }
            //不允许移动节点
            SubGraphObj.ApplyPermission(new Permission(true, false));
        };
        //设置顶部的导航
        this.SetTopNav = function(json) {
            $(".EplugGraphEditorTopNav").css("display", json ? "block" : "none");
            $(".EplugGraphEditorSubEditor").css("padding-top", json ? 191 : 130);
            $(".EplugGraphEditorTopElementName").attr("data-val", json && json._id || "").text(json && json.objname && json.objname.value || "");
        };
        //获取端口所在的设备节点 [网元编辑面板]
        this.GetRootDeviceCellInfo = function(cell) {
            //和网元平级显示的网络平面，直接返回自身
            if (cell && cell.data && cell.data.IsTopDevice == EnxConstField.BoolStr.Yes && cell.bigtype == EnxHelper.ModelType.Network) {
                return cell;
            }
            var parentCell = SubGraphObj.Graph.getModel().getParent(cell);
            if (!parentCell || parentCell.data && parentCell.data.IsTopDevice && parentCell.data.IsTopDevice == EnxConstField.BoolStr.Yes) {
                return parentCell;
            }
            parentCell = this.GetRootDeviceCellInfo(parentCell);
            return parentCell;
        };
        //连接事件
        this.ConnectHandler = mxUtils.bind(this, function(sender, evt) {
            var curentLink = evt.properties.edge;
            if (!curentLink.target) {
                return false;
            } else if (curentLink.source.bigtype == EnxHelper.ModelType.Network && curentLink.target.bigtype == EnxHelper.ModelType.Network) {
                //网络平面和网络平面之间不可以连线
                thisObj.Property.CoreGraph.removeCells([curentLink]);
                SubGraphObj.Graph.removeCells([curentLink]);
                toastr.warning("No connection between the network!");
                return false;
            } else {
                curentLink.style = EnxHelper.ModelType.Link;
                //回写连线数据
                //var edit = new EPlug();
                var parentId = SubGraphObj.EditGraphCell.target.data[EnxHelper.Field.ParentGID];
                var linkJson = edit.CreateModel(EnxHelper.ModelType.Link, parentId);
                linkJson[EnxConstField.AttrName.ENXFILE_ATTR_SOURCEDEVICEID][EnxConstField.AttrName.ENXFILE_ATTR_VALUE] = curentLink.source.id;
                linkJson[EnxConstField.AttrName.ENXFILE_ATTR_TARGETDEVICEID][EnxConstField.AttrName.ENXFILE_ATTR_VALUE] = curentLink.target.id;
                edit.Property.BusyPortId.push(curentLink.source.data.guid.value);
                edit.Property.BusyPortId.push(curentLink.target.data.guid.value);
                SubGraphObj.SetPortStatus(curentLink.source, false);
                SubGraphObj.SetPortStatus(curentLink.target, false);
                //为端口节点添加字段，注明顶层设备的json数据，为了后期的性能 （单个连线很快，后期如果存在批量删除连线，重新绘制会很慢）
                var sourceTopDeviceCell = SubGraphObj.GetRootDeviceCellInfo(curentLink.source);
                var targetTopDeviceCell = SubGraphObj.GetRootDeviceCellInfo(curentLink.target);
                curentLink.source[SubGraphObj.ConstInfo.ROOTDEVICE] = sourceTopDeviceCell.data;
                curentLink.target[SubGraphObj.ConstInfo.ROOTDEVICE] = targetTopDeviceCell.data;
                linkJson[EnxConstField.AttrName.ENXFILE_ATTR_SOURCETOPDEVICENAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE] = sourceTopDeviceCell.value;
                linkJson[EnxConstField.AttrName.ENXFILE_ATTR_TARGETTOPDEVICENAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE] = targetTopDeviceCell.value;
                thisObj.AttachCell(curentLink, linkJson);
                SubGraphObj.Graph.getModel().setValue(curentLink, linkJson[EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE]);
                SubGraphObj.SetLoopLinkPosition(curentLink);
                sender.connectionHandler.select = false;
                if (SubGraphObj.EditGraphCell.edge) {
                    //线条反填
                    var links = thisObj.GetAllLink(SubGraphObj.Graph, undefined, true);
                    thisObj.RenderVirtualLink(SubGraphObj.EditGraphCell.source, SubGraphObj.EditGraphCell.target, links);
                }
            }
        });
        //右键菜单
        this.InitPopMenu = function() {
            //1. 区分下连线编辑页面和网元编辑页面的区分
            SubGraphObj.Graph.popupMenuHandler.factoryMethod = function(menu, cell, evt) {
                if (!cell) {
                    return;
                }
                var selectItems = SubGraphObj.Graph.getSelectionCells(),
                    addKey = function(item, key) {
                        $(item).find("td:last").html('<span class="mxMenu-key">' + key + "</span>");
                    };
                selectItems = selectItems.length == 0 ? [cell] : selectItems;
                if (selectItems.length == 1) {
                    var item = menu.addItem("Edit", null, function() {
                        thisObj.PropertyPanel.EditNodeById(selectItems[0].id);
                    }, null, "mxMenu edit");
                    addKey(item, "Enter");
                }
                //通用操作，暂时只加删除
                var item = menu.addItem("Delete", null, function() {
                    SubGraphObj.RemoveSelectCell(selectItems);
                }, null, "mxMenu delete");
                addKey(item, "Del");
            };
        };
        //删除选中节点
        this.RemoveSelectCell = function(cells) {
            cells = cells || SubGraphObj.Graph.getSelectionCells();
            if (cells.length == 0) {
                return;
            }
            //一、网元和连线的分类/清除缓存数据/级联操作资源树；
            $.each(cells, function(index, cell) {
                //删除节点的关联操作
                SubGraphObj.RemoveCellRel(cell);
                //删除子元件的缓存数据
                edit.RemoveModelByParentId(cell.id, true);
                //删除当前元件缓存数据
                edit.RemoveModel(EnxHelper.Field.ID, cell.id);
                edit.Property.GraphPlug.RemoveCellById(cell.bigtype, cell.id);
            });
            var cell = cells[0];
            if (cell && cell.vertex && cell.data.IsTopDevice != "yes") {
                thisObj.Property.CoreGraph.fireEvent(new mxEventObject(mxEvent.CLICK, "event", null, "cell", SubGraphObj.EditGraphCell));
            }
            //三、画布中清除数据
            SubGraphObj.Graph.removeCells(cells);
            var allVertices = SubGraphObj.Graph.getChildVertices();
            if (allVertices.length == 0) {
                SubGraphObj.SetTopNav();
            }
        };
        //删除节点的关联操作：主要是连线和端口删除时对端口状态的更新;还有已经占用的端口或者其父级被删除的时候，对应主画布的连线也要被删除，有自连接的端口也要被重置状态；
        this.RemoveCellRel = function(cell) {
            //删除连线的时候，先清除端口的样式 [连线面板]
            if (cell.edge) {
                SubGraphObj.SetPortStatus(cell.target, true);
                SubGraphObj.SetPortStatus(cell.source, true);
                return;
            }
            var usedPortLst = [];
            //删除是端口的时，并且是占用的端口时 [网元编辑面板]
            if (cell.bigtype == EnxHelper.ModelType.Port && edit.Property.BusyPortId.indexOf(cell.id) > -1) {
                usedPortLst.push(cell);
            } else {
                //如果删除是单板或者子卡时，找出所有的占有端口 [网元编辑面板]
                var childrenCell = thisObj.GetAllNode(SubGraphObj.Graph, cell, true);
                usedPortLst = $.grep(childrenCell, function(childCell, index) {
                    return childCell.bigtype == EnxHelper.ModelType.Port && edit.Property.BusyPortId.indexOf(childCell.id) > -1;
                });
            }
            //遍历占用端口对应的连线：删除主画布的连线，如果是自连接，还要更新当前画布对端端口的状态 [网元编辑面板]
            if (usedPortLst.length == 0) {
                return;
            }
            $.each(usedPortLst, function(index, usedPort) {
                var edges = $.grep(EnvEditor.PlugObj.Property.LstLinkJson, function(n, m) {
                    return n.sourcedeviceid.value == usedPort.id || n.targetdeviceid.value == usedPort.id;
                });
                if (!edges || edges.length == 0) {
                    return;
                }
                var cellid = edges[0]._id;
                thisObj.RemoveCellById(EnxHelper.ModelType.Link, cellid);
                edit.RemoveModel(EnxHelper.Field.ID, cellid);
            });
        };
        //初始化链路编辑
        this.InitLinkEditor = function(link) {
            //取消子画布连线事件
            SubGraphObj.Graph.removeListener(SubGraphObj.ConnectHandler);
            var source = link.source;
            var target = link.target;
            var portTypeShow;
            //显示哪种类型的端口（1内联口，2外联口，空全部）
            if (source.id != target.id) {
                portTypeShow = 2;
            } else {
                portTypeShow = 1;
            }
            //源端设备加载
            this.RenderNe(source, true, portTypeShow, true);
            //连线处理
            if (source.id != target.id) {
                //终端设备加载。只有源端和终端设备不是同一设备时才执行
                this.RenderNe(target, true, portTypeShow, true);
                //源端和终端的连线处理
                var sourcetargetLinks = SubGraphObj.Graph.getModel().getEdgesBetween(source, target, false);
                SubGraphObj.CopyLinkFromCoreGraph(sourcetargetLinks);
            } else {
                //源端的自连线处理
                var sourceLoopLinks = SubGraphObj.Graph.getModel().getEdgesBetween(source, source, false);
                SubGraphObj.CopyLinkFromCoreGraph(sourceLoopLinks);
            }
            //重新绑定连线事件
            SubGraphObj.Graph.addListener(mxEvent.CELL_CONNECTED, SubGraphObj.ConnectHandler);
        };
        //复制主画布的连线到副画布
        this.CopyLinkFromCoreGraph = function(links) {
            if (links && links.length > 0) {
                var portDic = {};
                var arrRes = thisObj.GetAllNode(SubGraphObj.Graph, undefined, true);
                $.each(arrRes, function(index, node) {
                    if (node.bigtype == EnxHelper.ModelType.Port || node.bigtype == EnxHelper.ModelType.Network) {
                        portDic[node.data.guid.value] = node;
                    }
                });
                //获取所有的端口节点，然后作一个id和节点的json对象
                var parentNode = SubGraphObj.Graph.getDefaultParent();
                SubGraphObj.Graph.getModel().beginUpdate();
                try {
                    $.each(links, function(index, link) {
                        var data = link.data;
                        if (data) {
                            //1.获取端口ID
                            var sourceId = data[EnxConstField.AttrName.ENXFILE_ATTR_SOURCEDEVICEID][EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
                            var targetId = data[EnxConstField.AttrName.ENXFILE_ATTR_TARGETDEVICEID][EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
                            //2.端口的连线
                            var source = portDic[sourceId];
                            var target = portDic[targetId];
                            if (source && target) {
                                SubGraphObj.SetCellConnectable(source, false);
                                SubGraphObj.SetCellConnectable(target, false);
                                source[SubGraphObj.ConstInfo.ROOTDEVICE] = link.source.data;
                                target[SubGraphObj.ConstInfo.ROOTDEVICE] = link.target.data;
                                var tempGraphLink = SubGraphObj.Graph.insertEdge(parentNode, link.id, link.objname, portDic[sourceId], portDic[targetId], EnxHelper.ModelType.Link);
                                thisObj.AttachCell(tempGraphLink, link.data);
                                SubGraphObj.SetLoopLinkPosition(tempGraphLink);
                            }
                        }
                    });
                } finally {
                    SubGraphObj.Graph.getModel().endUpdate();
                }
            }
        };
        //设置cell是否可连线。网络平面一直可连线
        this.SetCellConnectable = function(cell, connectable) {
            if (cell && cell.bigtype != EnxHelper.ModelType.Network) {
                cell.setConnectable(connectable);
            }
        };
        //放入网元ne：放入的网元  hasSelf：是否包含本身(包括本身就是连线，不包含网元本身就是编辑网元) ；portTypeShow：显示哪种类型的端口（1内联口，2外联口，空全部）
        this.RenderNe = function(ne, hasSelf, portTypeShow, isLink) {
            var neIndex = neIndex ? neIndex : 0;
            //1.添加网元节点
            var parent = {};
            var root = SubGraphObj.Graph.getDefaultParent();
            SubGraphObj.Graph.getModel().beginUpdate();
            try {
                if (hasSelf) {
                    var jsonNode = JsonHelper.GetJsonByKey(edit.Property.LstNodeJson, EnxHelper.Field.ID, ne.id);
                    var bond = SubGraphObj.GetBond(jsonNode.BigType);
                    var tempVertex = thisObj.Translater.JsonToCell(SubGraphObj.Graph, jsonNode, root, bond, thisObj.ConstInfo.SwimStyle);
                    if (jsonNode.BigType == EnxHelper.ModelType.Network) {
                        tempVertex.setConnectable(true && isLink);
                    } else {
                        tempVertex.setConnectable(false);
                    }
                    parent = tempVertex;
                    if (edit.Property.BusyPortId.indexOf(jsonNode.guid.value) > -1) {
                        tempVertex.setConnectable(false);
                        tempVertex.using = "using";
                    }
                } else {
                    var parent = root;
                }
                SubGraphObj.RenderChildCell(ne, parent, hasSelf, portTypeShow, isLink);
            } finally {
                SubGraphObj.Graph.getModel().endUpdate();
            }
        };
        //获取定位信息
        this.GetBond = function(type) {
            var elementWidth = SubGraphObj.ConstInfo.ElementDeaultSet[type];
            var width = elementWidth ? elementWidth.Width : 90;
            return [0, 0, width, 30];
        };
        //渲染子节点parentCell :父节点  parentContain：父容器   子节点不一定放在父节点上，可能是另外一个容器；isPortConnect：是否连线面板；portTypeShow：显示哪种类型的端口（1内联口，2外联口，空全部）
        this.RenderChildCell = function(currentCell, parentContain, isPortConnect, portTypeShow, isLink) {
            var parentId = JsonHelper.GetStrValue(currentCell, thisObj.ConstInfo.AttrName.ID);
            var childNodeJson = JsonHelper.FilterListByValues(edit.Property.DataList, EnxHelper.Field.ParentGID, [parentId]);
            $.each(childNodeJson, function(index, jsonNode) {
                //外联端口在连线面板显示，内联口不显示.如果是external就是外部口， 除此之外其它的base1, fabric, 都是内联口。
                if (isPortConnect && jsonNode.BigType == EnxHelper.ModelType.Port && jsonNode.internal_external && jsonNode.internal_external.value) {
                    var internal_external_value = jsonNode.internal_external.value.toLowerCase().indexOf("external");
                    if (portTypeShow == 1 && internal_external_value > -1) {
                        return true;
                    }
                    if (portTypeShow == 2 && internal_external_value == -1) {
                        return true;
                    }
                }
                var width = SubGraphObj.ConstInfo.ElementDeaultSet[jsonNode.BigType].Width;
                var tempGraphNode = thisObj.Translater.JsonToCell(SubGraphObj.Graph, jsonNode, parentContain, [0, 0, width, 30], thisObj.ConstInfo.SwimStyle, isPortConnect);
                //网络平面在连线面板一定可以连线，在编辑面板不可以连线
                if (jsonNode.BigType == EnxHelper.ModelType.Network) {
                    tempGraphNode.setConnectable(true && isPortConnect && isLink);
                } else {
                    //设置网元是否可连线 （一定要考虑性能） 是端口或网络平面，并且是连线面板，并且占用端口不包含当前端口；
                    tempGraphNode.setConnectable(jsonNode.BigType == EnxHelper.ModelType.Port && isPortConnect && isLink && edit.Property.BusyPortId.indexOf(jsonNode.guid.value) < 0);
                }
                if (edit.Property.BusyPortId.indexOf(jsonNode.guid.value) > -1) {
                    SubGraphObj.Graph.getModel().setStyle(tempGraphNode, thisObj.ConstInfo.UsedPort);
                    tempGraphNode.using = "using";
                }
                SubGraphObj.RenderChildCell(tempGraphNode, tempGraphNode, isPortConnect, portTypeShow, isLink);
            });
        };
        //绑定事件
        this.BindEvent = function() {
            //单击事件
            SubGraphObj.Graph.addListener(mxEvent.CLICK, function(evt, sender) {
                thisObj.EditType = thisObj.ConstInfo.EnumEditType.Element;
                var cell = sender.properties.cell;
                if (!cell) {
                    thisObj.PropertyPanel.Hide();
                }
            });
            $(".tools-delete").off("click").click(function() {
                SubGraphObj.RemoveSelectCell();
            });
        };
        //常量
        this.ConstInfo = new function() {
            //默认宽度设置（注意有梯度）
            this.ElementDeaultSet = new function() {
                this.Ne = {
                    Width: 200
                };
                this.Tester = {
                    Width: 200
                };
                this.Dev = {
                    Width: 200
                };
                this.Atm = {
                    Width: 200
                };
                this.Sdh = {
                    Width: 200
                };
                this.Eth = {
                    Width: 200
                };
                this.Sftp = {
                    Width: 200
                };
                this.Network = {
                    Width: 105
                };
                this.Agent = {
                    Width: 200
                };
                this.Board = {
                    Width: 160
                };
                this.VM = {
                    Width: 160
                };
                this.SubBoard = {
                    Width: 140
                };
                this.Port = {
                    Width: 90
                };
            }();
            //附加字段，端口所在的设备
            this.ROOTDEVICE = "rootdevice";
        }();
        //插入节点"(对外接口)：主要用于树状结构的插入子节点
        this.InsertCell = function(type, parentId) {
            var allNodes = thisObj.GetAllNode(SubGraphObj.Graph, null, true);
            var parentCell = JsonHelper.GetJsonByKey(allNodes, thisObj.ConstInfo.AttrName.ID, parentId);
            if (!JsonHelper.IsEmptyJson(parentCell)) {
                thisObj.SubGraph.ResetNodeMovable();
                //树状和缓存已经都添加数据了
                thisObj.ExcuteDropInElement(SubGraphObj.Graph, parentCell, type, [], thisObj.ConstInfo.SwimStyle);
            }
        };

        function Permission(canSelectNode, canMoveVertet) {
            this.canSelectNode = canSelectNode != null ? canSelectNode : true;
            this.canMoveVertet = canMoveVertet != null ? canMoveVertet : true;
        }
    }();
    //工具箱切换
    this.ToggleToolBar = function(bigtype) {
        if (thisObj.EditType == thisObj.ConstInfo.EnumEditType.Topo) {
            thisObj.EditType = thisObj.ConstInfo.EnumEditType.Element;
        } else {
            thisObj.EditType = thisObj.ConstInfo.EnumEditType.Topo;
        }
        $(".EplugGraphEditorElementItem").hide();
        $(".EplugGraphEditorElementItem[data-edittype='" + thisObj.EditType + "']").show();
        $(".EplugGraphEditorElementItem[data-edittype='" + thisObj.ConstInfo.EnumEditType.Network + "']").show();
        $(".EplugGraphEditorTopMenu span").show();
        $(".EplugGraphEditorTopMenu span[data-hidetype='" + thisObj.EditType + "']").hide();
        //bigtype == Tester Sftp Agent时，只显示端口
        if (thisObj.EditType == thisObj.ConstInfo.EnumEditType.Element && bigtype && (bigtype == EnxHelper.ModelType.Tester || bigtype == EnxHelper.ModelType.Dev || bigtype == EnxHelper.ModelType.Sftp || bigtype == EnxHelper.ModelType.Agent)) {
            $(".EplugGraphEditorElementItem").hide();
            $(".EplugGraphEditorElementItem[data-type='Port']").show();
        }
    };
    //属性面板
    this.PropertyPanel = new function() {
        //当前对象
        var PropertyPanelObj = this;
        //当前需要编辑的节点
        this.EditNodeJson = {};
        this.CustomFields = {};
        //属性面板的dom元素id
        this.ElementId = "EplugGraphEditorPropertyEditPanel";
        //html模板
        this.HtmlTemplate = new function() {
            //模板 {0} 字段名称  {1}字段的显示值 {2}真实值
            this.FieldEditItem = '<tr data-fieldname="{0}"><td class="EplugGraphEditorPropertyPanelFieldTitle EPlugTextEllipsis">{1}:</td><td><input value="{2}" type="text" class="field_value" /></td></tr>';
            //模板 {0} 字段名称  {1}字段的显示值  {2}真实值  {3}显示的值
            this.FieldShowItem = '<tr data-fieldname="{0}"><td class="EplugGraphEditorPropertyPanelFieldTitle EPlugTextEllipsis">{1}:</td><td><label class="EPlugTextEllipsis EplugGraphEditorPropertyPanelFieldLink" title="{3}" data-val="{2}">{3}</label></td></tr>';
            //模板 {0} 字段名称  {1}字段的显示值 {2}真实值
            this.FieldEditSelItem = '<tr data-fieldname="{0}"><td class="EplugGraphEditorPropertyPanelFieldTitle EPlugTextEllipsis">{1}:</td><td><select>{2}</select></td></tr>';
            //select的option模板
            this.SelectOptionItem = '<option value="{0}" {2}>{1}</option>';
            this.FieldEditCustomItem = '<tr class="custom_field" data-fieldname="{0}"><td><input type="text" class="custom_field_key" placeholder="Key" value="{0}" /><span>:</span></td><td><input type="text" class="custom_field_value field_value" placeholder="Value" value="{1}" /><span class="glyphicon glyphicon-plus custom_field_add" aria-hidden="true" title="Add"></span><span class="glyphicon glyphicon-minus custom_field_delete" aria-hidden="true" title="Delete"></span></td></tr>';
        }();
        //初始化
        this.Init = function() {
            this.BindEvent();
        };
        //获取元素
        this.GetElement = function(seletor) {
            return $("#" + PropertyPanelObj.ElementId).find(seletor);
        };
        //绑定事件
        this.BindEvent = function() {
            //关闭属性窗口
            PropertyPanelObj.GetElement(".EplugGraphEditorPropertyPanelTitleBtn").off("click").click(function() {
                PropertyPanelObj.Hide();
            });
            $("#" + PropertyPanelObj.ElementId).off("change").on("change", "input,select", function() {
                PropertyPanelObj.updateProperties();
            });
        };
        // 更新属性
        this.updateProperties = function() {
            var newNodeJson = PropertyPanelObj.GetNodeJson();
            if (JsonHelper.IsEmptyJson(newNodeJson)) {
                return;
            }
            $.each(PropertyPanelObj.CustomFields, function(key, value) {
                delete PropertyPanelObj.EditNodeJson[key];
            });
            var updatedJson = JsonHelper.JsonArrSingleUpdate(edit.Property.DataList, EnxHelper.Field.ID, EnxConstField.AttrName.ENXFILE_ATTR_VALUE, PropertyPanelObj.EditNodeJson._id, newNodeJson);
            edit.Property.GraphPlug.UpdateCell(PropertyPanelObj.EditNodeJson.BigType, updatedJson);
        };
        //获取编辑后的数据
        this.GetNodeJson = function() {
            var nodeJson = {};
            PropertyPanelObj.GetElement(".EplugGraphEditorPropertyPanelLst tr").each(function(index, tr) {
                var $tr = $(this),
                    fieldName = $tr.attr("data-fieldname"),
                    fieldValue;
                if (!fieldName) {
                    return;
                }
                var $value = $tr.find("input.field_value");
                if ($value.length > 0) {
                    fieldValue = $.trim($value.val());
                    //objname 特殊处理
                    if (fieldName == EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME) {
                        var objnameDicId = edit.GetObjectNameCache();
                        if (objnameDicId[fieldValue] && objnameDicId[fieldValue] != PropertyPanelObj.EditNodeJson._id) {
                            fieldValue = fieldValue + edit.ConstInfo.RepeatedSingal;
                            $value.val(fieldValue);
                        }
                    }
                }
                var $select = $(this).find("select");
                if ($select.length > 0) {
                    fieldValue = $select.val();
                }
                if (fieldValue === undefined) {
                    return;
                }
                nodeJson[fieldName] = fieldValue;
            });
            return nodeJson;
        };
        //显示
        this.Show = function() {
            $("#" + PropertyPanelObj.ElementId).show(200);
        };
        //隐藏
        this.Hide = function() {
            this.Reset();
            $("#" + PropertyPanelObj.ElementId).hide(200);
        };
        //重置
        this.Reset = function() {
            PropertyPanelObj.GetElement(".EplugGraphEditorPropertyPanelLst").empty();
        };
        //添加字段
        this.AddField = function(fieldName) {
            var tr = EnxHelper.Format(PropertyPanelObj.HtmlTemplate.FieldEditItem, fieldName, fieldName, "");
            PropertyPanelObj.GetElement(".EplugGraphEditorPropertyPanelLst").append(tr);
        };
        //添加行
        this.AddTr = function(tr) {
            PropertyPanelObj.GetElement(".EplugGraphEditorPropertyPanelLst").append(tr);
        };
        //操作
        this.EditNodeById = function(id) {
            if (!id) {
                return;
            }
            PropertyPanelObj.EditNodeJson = JsonHelper.GetJsonByKey(edit.Property.DataList, EnxHelper.Field.ID, id);
            if (JsonHelper.IsEmptyJson(PropertyPanelObj.EditNodeJson)) {
                return;
            }
            PropertyPanelObj.Show();
            PropertyPanelObj.Reset();
            var bigType = PropertyPanelObj.EditNodeJson.BigType;
            var fieldLst = edit.HtmlEditor.GetModelField(bigType);
            var specialPortField = edit.GetSpecialField(bigType);
            var selectField = edit.ConstInfo.SelectField;
            $.each(fieldLst, function(index, fieldName) {
                var fieldDisplayName = edit.GetDisplayFieldName(fieldName);
                var fieldJson = JsonHelper.GetJsonValue(PropertyPanelObj.EditNodeJson, fieldName);
                var fieldValue = JsonHelper.GetStrValue(fieldJson, EnxConstField.AttrName.ENXFILE_ATTR_VALUE).replace(new RegExp('"', "gm"), "&quot;");
                var fieldDisplayValue = fieldValue;
                var tr = "";
                //不可编辑控制
                if (edit.ConstInfo.NoEditField.indexOf(fieldName) < 0) {
                    if (specialPortField.indexOf(fieldName) > -1) {
                        var portJson = JsonHelper.GetJsonByKeyAndSecondKey(edit.Property.LstPortJson, EnxConstField.AttrName.ENXFILE_ATTR_GUID, EnxConstField.AttrName.ENXFILE_ATTR_VALUE, fieldValue);
                        if (!JsonHelper.IsEmptyJson(portJson)) {
                            fieldDisplayValue = portJson[EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
                        }
                        tr = $(EnxHelper.Format(PropertyPanelObj.HtmlTemplate.FieldShowItem, fieldName, fieldDisplayName, fieldValue, fieldDisplayValue));
                        PropertyPanelObj.BindEventForLink(tr);
                    } else if (selectField.indexOf(fieldName) > -1) {
                        var options = "",
                            selectOptionValues = edit.Property.SelectOptionValues[fieldName];
                        $.each(selectOptionValues, function(index, optionValue) {
                            if (fieldDisplayValue && fieldDisplayValue == optionValue) {
                                options += EnxHelper.Format(PropertyPanelObj.HtmlTemplate.SelectOptionItem, optionValue, optionValue, "selected='selected'");
                            } else {
                                options += EnxHelper.Format(PropertyPanelObj.HtmlTemplate.SelectOptionItem, optionValue, optionValue, "");
                            }
                        });
                        tr = $(EnxHelper.Format(PropertyPanelObj.HtmlTemplate.FieldEditSelItem, fieldName, fieldDisplayName, options));
                    } else {
                        tr = $(EnxHelper.Format(PropertyPanelObj.HtmlTemplate.FieldEditItem, fieldName, fieldDisplayName, fieldValue));
                    }
                    PropertyPanelObj.AddTr(tr);
                }
            });
            var allkeys = JsonHelper.GetJsonAllKey(PropertyPanelObj.EditNodeJson);
            var nokeys = edit.HtmlEditor.GetModelUnAvailField(bigType);
            nokeys = nokeys.concat(JsonHelper.GetJsonAllValue(EnxHelper.Field), fieldLst);
            var cusKeys = $.grep(allkeys, function(n) {
                return $.inArray(n, nokeys) == -1;
            });
            PropertyPanelObj.CustomFields = {};
            $.each(cusKeys, function(i, v) {
                PropertyPanelObj.CustomFields[v] = PropertyPanelObj.EditNodeJson[v].value;
            });
            PropertyPanelObj.InitCustomFields();
        };
        //外联事件
        this.BindEventForLink = function($tr) {
            $tr.find(".EplugGraphEditorPropertyPanelFieldLink").off("click").click(function() {
                var portId = $(this).attr("data-val");
                PropertyPanelObj.EditNodeById(portId);
            });
        };
        this.InitCustomFields = function() {
            var customFields = PropertyPanelObj.CustomFields;
            if ($.isEmptyObject(customFields)) {
                PropertyPanelObj.AddCustomField();
            } else {
                $.each(customFields, function(i, v) {
                    PropertyPanelObj.AddCustomField(undefined, i, v);
                });
            }
        };
        this.AddCustomField = function($prev, key, value) {
            var $custom_field = $(EnxHelper.Format(PropertyPanelObj.HtmlTemplate.FieldEditCustomItem, key || "", value || ""));
            if ($prev) {
                $prev.after($custom_field);
            } else {
                PropertyPanelObj.AddTr($custom_field);
            }
            PropertyPanelObj.BindEventForCustomOps($custom_field);
        };
        this.BindEventForCustomOps = function($tr) {
            $tr.off("click").on("click", ".custom_field_add,.custom_field_delete", function() {
                var $el = $(this);
                if ($el.hasClass("custom_field_add")) {
                    PropertyPanelObj.AddCustomField($tr);
                } else {
                    $tr.remove();
                    PropertyPanelObj.updateProperties();
                }
            });
            $tr.off("change").on("change", ".custom_field_key", function() {
                var key = $.trim($(this).val());
                if (key) {
                    $tr.attr("data-fieldname", key);
                }
            });
        };
    }();
    //获取节点的显示名称。isPortConnect:是否连线面板
    this.GetDisplayNodeName = function(nodeJson, isPortConnect) {
        if (JsonHelper.IsEmptyJson(nodeJson)) {
            return;
        }
        var objname = nodeJson[EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
        var roler = JsonHelper.GetJsonValue(nodeJson, EnxConstField.AttrName.ENXFILE_ATTR_ROLER)[EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
        var displayNodeName = objname;
        if (nodeJson.BigType == EnxHelper.ModelType.Ne && roler) {
            displayNodeName += "(" + roler + ")";
        }
        if (isPortConnect && nodeJson.BigType == EnxHelper.ModelType.Port) {
            var interface_value = JsonHelper.GetJsonValue(nodeJson, EnxConstField.AttrName.ENXFILE_ATTR_INTERFACE)[EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
            if (interface_value) {
                displayNodeName = interface_value;
            }
        }
        return displayNodeName;
    };
    //渲染图形
    this.RenderData = function() {
        this.Property.CoreGraph.getModel().beginUpdate();
        var rootNode = this.Property.CoreGraph.getDefaultParent();
        rootNode[this.ConstInfo.AttrName.CANVASID] = edit.Property.TopoNode._id;
        rootNode[this.ConstInfo.AttrName.BIGTYPE] = edit.Property.TopoNode.BigType;
        try {
            var dicNode = {};
            //绘制批量节点
            $.each(edit.Property.LstNodeJson, function(index, node) {
                var tempGraphNode = thisObj.Translater.JsonToCell(thisObj.Property.CoreGraph, node, rootNode);
                var objname = node[EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
                dicNode[objname] = tempGraphNode;
            });
            //绘制链路
            $.each(edit.Property.LstLinkJson, function(index, link) {
                var sourceNodeName = JsonHelper.GetJsonValue(link, EnxConstField.AttrName.ENXFILE_ATTR_SOURCETOPDEVICENAME)[EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
                var targetNodeName = JsonHelper.GetJsonValue(link, EnxConstField.AttrName.ENXFILE_ATTR_TARGETTOPDEVICENAME)[EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
                var sourceNode = JsonHelper.GetJsonValue(dicNode, sourceNodeName);
                var targetNode = JsonHelper.GetJsonValue(dicNode, targetNodeName);
                if (JsonHelper.IsEmptyJson(sourceNode) && JsonHelper.IsEmptyJson(targetNode)) {
                    return true;
                }
                var linkName = link[EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
                var linkId = link[EnxHelper.Field.ID];
                thisObj.InsertLink(rootNode, linkId, linkName, sourceNode, targetNode, EnxHelper.ModelType.Link, link);
                //对于分组的特殊处理
                if (link.group) {
                    var groupName = link.group.value;
                    thisObj.ResetMaxGroupIndex(groupName);
                }
            });
        } finally {
            // Updates the display
            this.Property.CoreGraph.getModel().endUpdate();
        }
    };
    //根据两个网元信息渲染连线  [主画布上的连线都是虚拟的];
    this.RenderVirtualLink = function(source, target, afterEditLinks) {
        //获取两个节点的连线；
        var virtualLinks = this.GetLinksBetween(source, target, false),
            graph = this.Property.CoreGraph,
            self = this;
        graph.removeCells(virtualLinks);
        //新增的节点新划线；
        if (afterEditLinks) {
            var parentNode = graph.getDefaultParent();
            graph.getModel().beginUpdate();
            try {
                $.each(afterEditLinks, function(index, link) {
                    var tempSource = link.source.rootdevice._id == source.id ? source : target;
                    var tempTarget = link.target.rootdevice._id == target.id ? target : source;
                    var edge = thisObj.InsertLink(parentNode, link.id, link.objname, tempSource, tempTarget, EnxHelper.ModelType.Link, link.data);
                    if (index == afterEditLinks.length - 1) {
                        graph.setSelectionCell(edge);
                        self.SubGraph.SetTopNav(edge.data);
                    }
                });
            } finally {
                graph.getModel().endUpdate();
            }
        }
    };
    //获取两个节点间的连线 containLoop：是否包含自连接
    this.GetLinksBetween = function(source, target, containLoop) {
        var res = [];
        var res = this.Property.CoreGraph.getModel().getEdgesBetween(source, target, false);
        if (containLoop) {
            var resSourceLoop = this.Property.CoreGraph.getModel().getEdgesBetween(source, source, false);
            res = res.concat(resSourceLoop);
            var resTargetLoop = this.Property.CoreGraph.getModel().getEdgesBetween(target, target, false);
            res = res.concat(resTargetLoop);
        }
        return res;
    };
    //主画布删除连线:删除当前连线，并且重新绘制兄弟连线; baseLineRelDel:基线删除是否级联删除同组数据
    this.RemoveLink = function(link, baseLineRelDel) {
        this.Property.CoreGraph.removeCells([link]);
        var oldLinks = this.Property.CoreGraph.getModel().getEdgesBetween(link.source, link.target, false);
        //this.Property.CoreGraph.removeCells(oldLinks);
        //如果删除的是分组的基线，则需要对剩下的连线重新分组
        var isBaseLine = link.data && link.data.group && link.data.group.groupshow;
        var tempShowBeGroup = [];
        $.each(oldLinks, function(index, linkItem) {
            //thisObj.CopyLink(linkItem, false);
            if (isBaseLine && linkItem.data.group && linkItem.data.group.value == link.data.group.value) {
                if (!baseLineRelDel) {
                    tempShowBeGroup.push(linkItem.id);
                } else {
                    thisObj.RemoveLink(linkItem);
                    //删除缓存
                    edit.RemoveModel(EnxHelper.Field.ID, linkItem.id);
                }
            }
        });
        if (tempShowBeGroup.length > 0) {
            thisObj.GroupLink(tempShowBeGroup);
        }
    };
    //用缓存json来附加节点字段
    this.AttachCell = function(cell, json) {
        var id = json[EnxHelper.Field.ID];
        var bigType = json[EnxHelper.Field.BigType];
        var objname = json[EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
        cell[thisObj.ConstInfo.AttrName.BIGTYPE] = bigType;
        cell[thisObj.ConstInfo.AttrName.OBJNAME] = objname;
        cell[thisObj.ConstInfo.AttrName.DATA] = json;
        cell[thisObj.ConstInfo.AttrName.CANVASID] = id;
        cell[thisObj.ConstInfo.AttrName.ID] = id;
    };
    //重置最大连线分组的索引
    this.ResetMaxGroupIndex = function(groupName) {
        var res = groupName.match(new RegExp("0|[1-9]\\d*", "gm"));
        if (res && res.length > 0) {
            if (this.Property.LinkGroupIndex <= parseInt(res[res.length - 1])) {
                this.Property.LinkGroupIndex = parseInt(res[res.length - 1]) + 1;
            }
        }
    };
    //转换器 （Json 转绘制节点；  节点转Json） Json：XML直接解析后的json
    this.Translater = new function() {
        //尽量的完美还原，对于细致数据的差别
        this.FixFlex = new function() {
            //X轴相对于flex的增量
            this.XAdd = 5;
            //Y轴相对于flex的增量
            this.YAdd = 25;
        }();
        //固定返回四位的数组，分别是x,y,width,height;
        this.GetJsonBond = function(json) {
            var result = [0, 0, thisObj.ConstInfo.FixWidth, thisObj.ConstInfo.FixHeight];
            //150,129;192,225   317,338;359,434    494,296;536,392
            var strPosition = JsonHelper.GetJsonValue(json, EnxConstField.AttrName.ENXFILE_ATTR_POSITION)[EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
            if (strPosition && strPosition.indexOf(";") > -1) {
                var arrPositon = strPosition.split(";");
                var x = 0,
                    y = 0,
                    x2 = 0,
                    y2 = 0;
                if (arrPositon[0].indexOf(",") > -1) {
                    var startPostion = arrPositon[0].split(",");
                    x = parseInt(startPostion[0]) - this.FixFlex.XAdd;
                    y = parseInt(startPostion[1]) - this.FixFlex.YAdd;
                }
                if (arrPositon[1].indexOf(",") > -1) {
                    var endPostion = arrPositon[1].split(",");
                    x2 = parseInt(endPostion[0]) - this.FixFlex.XAdd;
                    y2 = parseInt(endPostion[1]) - this.FixFlex.YAdd;
                }
                var width = x2 - x;
                var height = y2 - y;
                result[0] = x;
                result[1] = y;
                result[2] = 62;
                //width;//统一尺寸80*78
                result[3] = 62;
            }
            return result;
        };
        //位置信息转为字符串
        this.BondToString = function(cell) {
            var geo = cell[thisObj.ConstInfo.AttrName.GEOMETRY];
            if (!geo) {
                geo = {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                };
            }
            var x = geo.x + this.FixFlex.XAdd;
            var y = geo.y + this.FixFlex.YAdd;
            var width = geo.width;
            var height = geo.height;
            var x2 = x + width;
            var y2 = y + height;
            return x + "," + y + ";" + x2 + "," + y2;
        };
        //Json数据转节点
        this.JsonToCell = function(graph, node, parentCell, bond, style, isPortConnect) {
            if ($.isEmptyObject(node)) {
                return;
            }
            var postion = bond;
            if (!bond || bond.length == 0) {
                postion = thisObj.Translater.GetJsonBond(node);
            }
            var id = node[EnxHelper.Field.ID];
            var displayName = thisObj.GetDisplayNodeName(node, isPortConnect);
            var bigType = node[EnxHelper.Field.BigType];
            var objname = node[EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
            var tempGraphNode = graph.insertVertex(parentCell, id, displayName, postion[0], postion[1], postion[2], postion[3], style ? style : bigType);
            thisObj.AttachCell(tempGraphNode, node);
            return tempGraphNode;
        };
    }();
    //设置样式
    this.ConfigureStylesheet = function() {
        //网元样式
        var neStyle = {};
        neStyle[mxConstants.STYLE_SHAPE] = mxConstants.SHAPE_IMAGE;
        neStyle[mxConstants.STYLE_IMAGE] = imgPath + "v-ne.png";
        neStyle[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_TOP;
        neStyle[mxConstants.STYLE_VERTICAL_LABEL_POSITION] = mxConstants.ALIGN_BOTTOM;
        neStyle[mxConstants.STYLE_FONTCOLOR] = "#333";
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Ne, neStyle);
        //测试仪样式
        var testerStyle = $.extend({}, neStyle);
        testerStyle[mxConstants.STYLE_IMAGE] = imgPath + "v-tester.png";
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Tester, testerStyle);
        var devStyle = $.extend({}, neStyle);
        devStyle[mxConstants.STYLE_IMAGE] = imgPath + "v-tester.png";
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Dev, devStyle);
        //ATM样式
        var atmStyle = $.extend({}, neStyle);
        atmStyle[mxConstants.STYLE_IMAGE] = imgPath + "v-atm.png";
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Atm, atmStyle);
        //ETH样式
        var ethStyle = $.extend({}, neStyle);
        ethStyle[mxConstants.STYLE_IMAGE] = imgPath + "v-eth.png";
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Eth, ethStyle);
        //SDH样式
        var sdhStyle = $.extend({}, neStyle);
        sdhStyle[mxConstants.STYLE_IMAGE] = imgPath + "v-sdh.png";
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Sdh, sdhStyle);
        //Sftp样式
        var sftpStyle = $.extend({}, neStyle);
        sftpStyle[mxConstants.STYLE_IMAGE] = imgPath + "v-sftp.png";
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Sftp, sftpStyle);
        //Agent样式
        var computerStyle = $.extend({}, neStyle);
        computerStyle[mxConstants.STYLE_IMAGE] = imgPath + "v-agent.png";
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Agent, computerStyle);
        //Network样式
        var networkStyle = $.extend({}, neStyle);
        networkStyle[mxConstants.STYLE_IMAGE] = imgPath + "v-network.png";
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Network, networkStyle);
        //连线样式
        var lineStyle = {};
        lineStyle[mxConstants.STYLE_STROKECOLOR] = thisObj.ConstInfo.LineDefualtColor;
        lineStyle[mxConstants.STYLE_STROKEWIDTH] = 1.3;
        lineStyle[mxConstants.STYLE_FONTSTYLE] = 2;
        lineStyle[mxConstants.STYLE_PERIMETER_SPACING] = 1;
        lineStyle[mxConstants.STYLE_ENDARROW] = "";
        lineStyle[mxConstants.STYLE_FONTCOLOR] = "#5e698a";
        lineStyle[mxConstants.STYLE_FONTSIZE] = 12;
        lineStyle[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_BOTTOM;
        this.Property.CoreGraph.getStylesheet().putCellStyle(EnxHelper.ModelType.Link, lineStyle);
        //自连接样式
        var loopLinkStyle = $.extend({}, lineStyle);
        loopLinkStyle[mxConstants.STYLE_CURVED] = true;
        this.Property.CoreGraph.getStylesheet().putCellStyle(thisObj.ConstInfo.LoopLinkStyleName, loopLinkStyle);
        var loopGroupLinkStyle = $.extend({}, lineStyle);
        loopGroupLinkStyle[mxConstants.STYLE_CURVED] = true;
        loopGroupLinkStyle[mxConstants.STYLE_STROKEWIDTH] = 1.3;
        loopGroupLinkStyle[mxConstants.STYLE_STROKECOLOR] = "#525ae9";
        this.Property.CoreGraph.getStylesheet().putCellStyle(thisObj.ConstInfo.LoopGroupLinkStyleName, loopGroupLinkStyle);
        var virtualLinkStyle = $.extend({}, lineStyle);
        virtualLinkStyle[mxConstants.STYLE_DASHED] = 1;
        this.Property.CoreGraph.getStylesheet().putCellStyle(thisObj.ConstInfo.VirtualLinkStyleName, virtualLinkStyle);
    };
    //获取所有的绘制节点 (后面可能会有级联的节点获取)
    this.GetAllNode = function(graph, parentNode, recursion) {
        var tempParrent = parentNode ? parentNode : graph.getDefaultParent();
        var arrRes = graph.getModel().getChildVertices(tempParrent);
        if (recursion && arrRes && arrRes.length > 0) {
            $.each(arrRes, function(index, node) {
                var childNodes = thisObj.GetAllNode(graph, node, recursion);
                arrRes = arrRes.concat(childNodes);
            });
        }
        return arrRes;
    };
    //获取所有的绘制链路
    this.GetAllLink = function(graph, parentNode, recursion) {
        var arrRes = [];
        var tempParrent = parentNode ? parentNode : graph.getDefaultParent();
        var arrRes = graph.getModel().getChildEdges(tempParrent);
        if (recursion) {
            var arrNodeRes = graph.getModel().getChildVertices(tempParrent);
            $.each(arrNodeRes, function(index, node) {
                var tempEdges = thisObj.GetAllLink(graph, node, recursion);
                arrRes = arrRes.concat(tempEdges);
            });
        }
        return arrRes;
    };
    //根据某个字段的值列表获取元件(可以是节点，也可以是连线)
    this.GetCellsByFieldValue = function(type, fieldName, fieldValue) {
        var tempElmt = [];
        switch (type) {
            case EnxHelper.ModelType.Ne:
            case EnxHelper.ModelType.Tester:
            case EnxHelper.ModelType.Dev:
            case EnxHelper.ModelType.Sdh:
            case EnxHelper.ModelType.Atm:
            case EnxHelper.ModelType.Eth:
            case EnxHelper.ModelType.Board:
            case EnxHelper.ModelType.SubBoard:
            case EnxHelper.ModelType.Port:
                tempElmt = this.GetAllNode(thisObj.Property.CoreGraph);
                break;

            case EnxHelper.ModelType.Link:
                tempElmt = this.GetAllLink(thisObj.Property.CoreGraph);
                break;

            default:
                tempElmt = this.GetAllNode(thisObj.Property.CoreGraph);
                break;
        }
        var cellJson = JsonHelper.GetJsonByKey(tempElmt, fieldName, fieldValue);
        return cellJson;
    };
    //更新节点
    this.UpdateCell = function(type, json) {
        var id = JsonHelper.GetStrValue(json, EnxHelper.Field.ID),
            isTopDevice = json.IsTopDevice == EnxConstField.BoolStr.Yes,
            isLink = type == EnxHelper.ModelType.Link,
            cell;
        if (isTopDevice || isLink) {
            //连线或者顶层设备，在主画布获取
            cell = thisObj.GetCellsByFieldValue(type, thisObj.ConstInfo.AttrName.ID, id);
        } else {
            //其他类型的在副画布获取
            var allCell = thisObj.GetAllNode(thisObj.SubGraph.Graph, null, true);
            cell = JsonHelper.GetJsonByKey(allCell, thisObj.ConstInfo.AttrName.ID, json._id);
        }
        if (JsonHelper.IsEmptyJson(cell)) {
            return;
        }
        var isNameChanged = cell.objname != json.objname.value;
        //只有顶层设备修改，并且名称有变动的时候才会更新子节点的名称
        if (isTopDevice && isNameChanged) {
            thisObj.UpdateCellRelChildren(id, cell.objname, json.objname.value);
        }
        var value = thisObj.GetDisplayNodeName(json);
        cell[thisObj.ConstInfo.AttrName.OBJNAME] = json[EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
        cell[thisObj.ConstInfo.AttrName.DATA] = json;
        thisObj.Property.CoreGraph.getModel().setValue(cell, value);
        thisObj.SubGraph.Graph.getModel().setValue(cell, value);
        if (isTopDevice && isNameChanged || isLink) {
            thisObj.SubGraph.EditCell(cell);
        }
    };
    //更新节点名称的时候:子设备名称前缀同步更改;所有连线的名称修改；对端子节点的名称修改；
    this.UpdateCellRelChildren = function(id, oldname, newname) {
        var childrens = edit.GetChildrens(id, true);
        $.each(childrens, function(index, value) {
            var childName = value.objname.value;
            if (childName.indexOf(oldname) == 0 && childName.substr(oldname.length, 1) == EnxConstField.NameSeparate) {
                childName = childName.replace(oldname, newname);
            }
            value[EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME][EnxConstField.AttrName.ENXFILE_ATTR_VALUE] = childName;
            thisObj.UpdateCell(value.BigType, value);
        });
    };
    //基本的固定设置
    this.BasicFixSet = function() {
        //可以调整大小
        this.Property.CoreGraph.cellsResizable = false;
        //可以编辑
        this.Property.CoreGraph.cellsEditable = false;
        //链路无法移动
        this.Property.CoreGraph.edgeLabelsMovable = false;
        //只让节点连线
        this.Property.CoreGraph.allowDanglingEdges = false;
        //自身连接
        this.Property.CoreGraph.allowLoops = true;
        //可以连线
        this.Property.CoreGraph.setConnectable(true);
        //支持拖入
        this.Property.CoreGraph.setDropEnabled(true);
        //鼠标悬浮
        this.Property.CoreGraph.setTooltips(true);
        // 添加布局
        var layout = new mxParallelEdgeLayout(this.Property.CoreGraph);
        var layoutMgr = new mxLayoutManager(this.Property.CoreGraph);
        layoutMgr.getLayout = function(cell) {
            if (cell.getChildCount() > 0) {
                return layout;
            }
        };
        //鼠标框选
        new mxRubberband(this.Property.CoreGraph);
        thisObj.ConfigureStylesheet();
        mxConstants.DEFAULT_FONTFAMILY = "Helvetica,Arial";
        //字体
        //设置对象选中状态的颜色、线宽
        mxConstants.VERTEX_SELECTION_COLOR = "#87CEEB";
        // 浅蓝色
        mxConstants.VERTEX_SELECTION_STROKEWIDTH = 1.3;
        // 2像素
        mxConstants.VERTEX_SELECTION_DASHED = false;
        //不要虚线
        mxConstants.EDGE_SELECTION_COLOR = "#87CEEB";
        // 浅蓝色
        mxConstants.EDGE_SELECTION_DASHED = false;
        //不要虚线
        mxConstants.EDGE_SELECTION_STROKEWIDTH = 1.3;
        // 2像素
        mxConstants.DEFAULT_FONTSIZE = 14;
        // 字体大小
        mxConstants.HIGHLIGHT_STROKEWIDTH = 1.3;
        mxConstants.LOCKED_HANDLE_FILLCOLOR = "#87CEEB";
        mxConstants.HANDLE_STROKECOLOR = "#87CEEB";
        mxEvent.disableContextMenu(this.Property.Contain);
        //禁用鼠标右键菜单
        new mxCellTracker(this.Property.CoreGraph, "#87CEEB");
        //鼠标停留高亮元素
        mxCellHighlight.prototype.spacing = 0;
        this.Property.CoreGraph.setCellsResizable(false);
        this.Property.CoreGraph.setCellsBendable(false);
        //去掉箭头
        delete this.Property.CoreGraph.getStylesheet().getDefaultEdgeStyle()["endArrow"];
        //去锯齿效果
        mxRectangleShape.prototype.crisp = true;
        //引导线
        mxGraphHandler.prototype.guidesEnabled = true;
        //连线不可以编辑
        this.PermissionApply(new this.Permission(false), this.Property.CoreGraph);
        this.ExtendsHook(this.Property.CoreGraph);
        this.Property.CoreGraph.getTooltipForCell = function(cell) {
            if (cell.vertex) {
                var data = cell.data;
                return '<ul class="core_tip"><li><span class="tip_title">Name:</span><span>' + data.objname.value + '</span></li><li><span class="tip_title">IP:</span><span>' + data.ip.value + '</span></li><li><span class="tip_title">Type:</span><span>' + data.type.value + "</span></li></ul>";
            }
            return cell.value;
        };
        this.IconSet(this.Property.CoreGraph);
    };
    this.IconSet = function(graph) {
        function mxIconSet(state) {
            this.images = [];
            var graph = state.view.graph;
            var img = mxUtils.createImage(imgPath + "edit.png");
            img.setAttribute("title", "Edit");
            img.style.position = "absolute";
            img.style.cursor = "pointer";
            img.style.width = "20px";
            img.style.height = "20px";
            img.style.left = state.x + state.width + "px";
            img.style.top = state.y - 16 + "px";
            mxEvent.addGestureListeners(img, mxUtils.bind(this, function(evt) {
                // Disables dragging the image
                mxEvent.consume(evt);
            }));
            mxEvent.addListener(img, "click", mxUtils.bind(this, function(evt) {
                thisObj.PropertyPanel.EditNodeById(state.cell.id);
                mxEvent.consume(evt);
                this.destroy();
            }));
            state.view.graph.container.appendChild(img);
            this.images.push(img);
        }
        mxIconSet.prototype.destroy = function() {
            if (this.images != null) {
                for (var i = 0; i < this.images.length; i++) {
                    var img = this.images[i];
                    img.parentNode.removeChild(img);
                }
            }
            this.images = null;
        };
        var iconTolerance = 20;
        graph.addMouseListener({
            currentState: null,
            currentIconSet: null,
            mouseDown: function(sender, me) {
                if (this.currentState != null) {
                    this.dragLeave(me.getEvent(), this.currentState);
                    this.currentState = null;
                }
            },
            mouseMove: function(sender, me) {
                if (this.currentState != null && (me.getState() == this.currentState || me.getState() == null)) {
                    var tol = iconTolerance;
                    var tmp = new mxRectangle(me.getGraphX() - tol, me.getGraphY() - tol, 2 * tol, 2 * tol);
                    if (mxUtils.intersects(tmp, this.currentState)) {
                        return;
                    }
                }
                var tmp = graph.view.getState(me.getCell());
                if (graph.isMouseDown || tmp != null && !graph.getModel().isVertex(tmp.cell)) {
                    tmp = null;
                }
                if (tmp != this.currentState) {
                    if (this.currentState != null) {
                        this.dragLeave(me.getEvent(), this.currentState);
                    }
                    this.currentState = tmp;
                    if (this.currentState != null) {
                        this.dragEnter(me.getEvent(), this.currentState);
                    }
                }
            },
            mouseUp: function(sender, me) {},
            dragEnter: function(evt, state) {
                if (this.currentIconSet == null) {
                    this.currentIconSet = new mxIconSet(state);
                }
            },
            dragLeave: function(evt, state) {
                if (this.currentIconSet != null) {
                    this.currentIconSet.destroy();
                    this.currentIconSet = null;
                }
            }
        });
    };
    //Extends hook functions
    this.ExtendsHook = function(graph) {
        var oldDisconnectable = graph.isCellDisconnectable;
        graph.isCellDisconnectable = function(cell, terminal, source) {
            return oldDisconnectable.apply(this, arguments) && currentCorePermission.editEdges;
        };
    };
    //permission apply reset
    this.PermissionApply = function(permission, graph) {
        currentCorePermission = permission;
    };
    //permission prototype setvalue
    this.Permission = function(editEdges, editVertices, locked, createEdges, cloneCells) {
        this.editEdges = editEdges != null ? editEdges : true;
        this.editVertices = editVertices != null ? editVertices : true;
        this.locked = locked != null ? locked : false;
        this.createEdges = createEdges != null ? createEdges : true;
        this.cloneCells = cloneCells != null ? cloneCells : true;
    };
    //permission apply
    this.Permission.prototype.apply = function(graph) {
        graph.setConnectable(this.createEdges);
        graph.setCellsLocked(this.locked);
    };
    //获取当前画布
    this.GetCurrentGraph = function() {
        var garph = null;
        if (thisObj.EditType == thisObj.ConstInfo.EnumEditType.Topo) {
            graph = thisObj.Property.CoreGraph;
        }
        if (thisObj.EditType == thisObj.ConstInfo.EnumEditType.Element) {
            graph = thisObj.SubGraph.Graph;
        }
        return graph;
    };
    //连接事件
    this.ConnectHandler = mxUtils.bind(this, function(sender, evt) {
        //删除线条，打开连线子画布
        var curentLink = evt.properties.edge,
            coreGraph = thisObj.Property.CoreGraph,
            coreModel = coreGraph.getModel();
        if (!curentLink.target) {
            return false;
        } else if (curentLink.source.bigtype == EnxHelper.ModelType.Network && curentLink.target.bigtype == EnxHelper.ModelType.Network) {
            //网络平面和网络平面之间不可以连线
            coreGraph.removeCells([curentLink]);
            toastr.warning("No connection between the network!");
            return false;
        } else {
            //用于控制连线的两个网元在副画布的距离；
            curentLink.bigtype = EnxHelper.ModelType.Link;
            curentLink.style = thisObj.ConstInfo.VirtualLinkStyleName;
            setTimeout(function() {
                coreGraph.fireEvent(new mxEventObject(mxEvent.CLICK, "event", evt, "cell", curentLink));
            }, 100);
        }
    });
    //为菜单栏绑定事件
    this.BindEventForMenu = function() {
        //保存图片
        $(".spanEditorBtnSaveImg").off("click").click(function() {
            thisObj.SaveAsImage();
        });
    };
    //获取图片的64位编码
    this.GetImageUrl = function() {
        var enxImageUrl = "";
        var graph = thisObj.GetCurrentGraph();
        var bounds = graph.getGraphBounds();
        var w = Math.round(bounds.x + bounds.width + 4);
        var h = Math.round(bounds.y + bounds.height + 4);
        var xml = mxUtils.getXml(mxUtils.getViewXml(graph, 1), "\n");
        var imgParam = {
            height: h,
            width: w,
            mxXml: encodeURIComponent(xml)
        };
        $.ajax({
            type: "POST",
            url: "/Home/EnxToImage",
            data: JSON.stringify(imgParam),
            dataType: "json",
            contentType: "application/json; charset=utf-8",
            success: function(data) {
                enxImageUrl = data.url;
                var d = window.open("about:blank");
                d.document.write("<img src='" + enxImageUrl + "' alt='No Image'/>");
            }
        });
        return enxImageUrl;
    };
    //保存为图片
    this.SaveAsImage = function() {
        var imageUrl = thisObj.GetImageUrl();
    };
    this.OnClick = function(sender, evt) {
        thisObj.EditType = thisObj.ConstInfo.EnumEditType.Topo;
        thisObj.SelectItemHandle();
        var cell = evt.getProperty("cell");
        EnvEditor.toggleRightContainer(cell);
        thisObj.PropertyPanel.Hide();
        thisObj.SubGraph.EditCell(cell);
    };
    //图形相关绑定事件
    this.BindEvent = function() {
        //单击网元或者连线
        thisObj.Property.CoreGraph.addListener(mxEvent.CLICK, thisObj.OnClick);
        ////拖拽工具箱元件
        var eles = $(".EplugGraphEditorElementItem,.SubToolbarItem");
        $.each(eles, function(index, elem) {
            if (mxClient.IS_IE) {
                mxEvent.addListener(elem, "dragstart", function(evt) {
                    evt.returnValue = false;
                });
            }
            elem.onselectstart = function() {
                return false;
            };
            //element, graphF, funct, dragElement, dx, dy, autoscroll,scalePreview, highlightDropTargets, getDropTarget
            var ds = mxUtils.makeDraggable(elem, function(evt) {
                thisObj.EditType = $(elem).attr("data-edittype");
                return thisObj.GetCurrentGraph();
            }, function(graph, evt, target, x, y) {
                thisObj.DropInElement(graph, evt, target, x, y, this.dragElement);
            }, elem.cloneNode(true), null, null, thisObj.Property.CoreGraph.autoscroll, true);
            ds.isGuidesEnabled = function() {
                return thisObj.Property.CoreGraph.graphHandler.guidesEnabled;
            };
            ds.createDragElement = mxDragSource.prototype.createDragElement;
        });
        //连线事件
        thisObj.Property.CoreGraph.removeListener(thisObj.ConnectHandler);
        thisObj.Property.CoreGraph.addListener(mxEvent.CELL_CONNECTED, thisObj.ConnectHandler);
        //键盘事件
        thisObj.BindKeyEvent();
    };
    // Handles cursor keys
    this.KeyHandler = function(keyCode) {
        if (!thisObj.Property.CoreGraph.isSelectionEmpty()) {
            var dx = 0;
            var dy = 0;
            if (keyCode == 37) {
                dx = -1;
            } else if (keyCode == 38) {
                dy = -1;
            } else if (keyCode == 39) {
                dx = 1;
            } else if (keyCode == 40) {
                dy = 1;
            }
            thisObj.Property.CoreGraph.moveCells(thisObj.Property.CoreGraph.getSelectionCells(), dx, dy);
        }
    };
    //绑定键盘事件
    this.BindKeyEvent = function() {
        var keyHandler = new mxKeyHandler(thisObj.Property.CoreGraph);
        keyHandler.bindKey(13, function() {
            var graph = thisObj.GetCurrentGraph();
            var cell = graph.getSelectionCell();
            if (cell) {
                thisObj.PropertyPanel.EditNodeById(cell.id);
            }
        });
        keyHandler.bindKey(37, function() {
            thisObj.KeyHandler(37);
        });
        keyHandler.bindKey(38, function() {
            thisObj.KeyHandler(38);
        });
        keyHandler.bindKey(39, function() {
            thisObj.KeyHandler(39);
        });
        keyHandler.bindKey(40, function() {
            thisObj.KeyHandler(40);
        });
        keyHandler.bindKey(46, function() {
            var graph = thisObj.GetCurrentGraph();
            var selectItems = graph.getSelectionCells();
            //此处如此冗余就是为了兼容谷歌
            if (thisObj.EditType == thisObj.ConstInfo.EnumEditType.Topo) {
                thisObj.RemoveSelectCell(selectItems);
            }
            if (thisObj.EditType == thisObj.ConstInfo.EnumEditType.Element) {
                thisObj.SubGraph.RemoveSelectCell(selectItems);
            }
        });
        keyHandler.bindControlKey(65, function() {
            thisObj.selectAll();
        });
        keyHandler.bindControlKey(67, function() {
            thisObj.Copy();
        });
        keyHandler.bindControlKey(86, function() {
            thisObj.Paste();
        });
    };
    //获取顶层设备的位置信息
    this.GetTopDeviceBond = function(type, x, y) {
        var bond = [x, y, 62, 62];
        return bond;
    };
    //拖入元素
    this.DropInElement = function(graph, evt, target, x, y, sourceElem) {
        var modelType = $(sourceElem).attr("data-type");
        var tempGraphNode = {};
        var parent = {};
        var bond = [];
        var style = "";
        //主画布
        if (thisObj.EditType == thisObj.ConstInfo.EnumEditType.Topo) {
            graph = thisObj.Property.CoreGraph;
            if (EnxHelper.ModelTypeOfTopDevice.indexOf(modelType) > -1) {
                parent = graph.getDefaultParent();
                bond = thisObj.GetTopDeviceBond(modelType, x, y);
            }
        }
        //子画布
        if (thisObj.EditType == thisObj.ConstInfo.EnumEditType.Element) {
            var targetType = target && target.bigtype || "";
            //target为网元的时候，只能插入单板和端口
            //单板只接受端口和子卡 ;target为子卡的时候，只能拖入端口
            if (targetType == EnxHelper.ModelType.Ne && (modelType == EnxHelper.ModelType.Board || modelType == EnxHelper.ModelType.Port || modelType == EnxHelper.ModelType.VM || modelType == EnxHelper.ModelType.Network)) {
                parent = target;
            } else if ((targetType == EnxHelper.ModelType.Board || targetType == EnxHelper.ModelType.VM) && (modelType == EnxHelper.ModelType.SubBoard || modelType == EnxHelper.ModelType.Port) || targetType == EnxHelper.ModelType.SubBoard && modelType == EnxHelper.ModelType.Port) {
                parent = target;
            } else if ((targetType == EnxHelper.ModelType.Tester || targetType == EnxHelper.ModelType.Sftp || targetType == EnxHelper.ModelType.Agent) && modelType == EnxHelper.ModelType.Port) {
                parent = target;
            }
            //重置可移动性
            thisObj.SubGraph.ResetNodeMovable();
            graph = thisObj.SubGraph.Graph;
            style = thisObj.ConstInfo.SwimStyle;
        }
        if (JsonHelper.IsEmptyJson(parent)) {
            toastr.warning("Subelements are not allowed to add!");
            return;
        }
        tempGraphNode = thisObj.ExcuteDropInElement(graph, parent, modelType, bond, style);
        if (tempGraphNode.vertex) {
            //graph.scrollCellToVisible(tempGraphNode);
            var $el = $(graph.container);
            $el.scrollTop($el.height());
            graph.setSelectionCell(tempGraphNode);
            graph.fireEvent(new mxEventObject(mxEvent.CLICK, "event", evt, "cell", tempGraphNode));
        }
    };
    //执行元素的拖入，都是有效的
    this.ExcuteDropInElement = function(graph, parentCell, type, bond, style) {
        var parentName = JsonHelper.GetStrValue(parentCell, thisObj.ConstInfo.AttrName.OBJNAME);
        var parentId = JsonHelper.GetStrValue(parentCell, thisObj.ConstInfo.AttrName.CANVASID);
        var parentType = JsonHelper.GetStrValue(parentCell, thisObj.ConstInfo.AttrName.BIGTYPE);
        //缓存添加数据
        var nodeJson = edit.CreateModel(type, parentId, parentName, parentType);
        var postion = bond;
        if (!bond || bond.length == 0) {
            postion = thisObj.SubGraph.GetBond(type);
        }
        var tempGraphNode = this.Translater.JsonToCell(graph, nodeJson, parentCell, postion, style);
        //主画布的所有元素都可以连线；
        if (thisObj.EditType == thisObj.ConstInfo.EnumEditType.Topo) {
            tempGraphNode.setConnectable(true);
        } else {
            if (thisObj.SubGraph.EditGraphCell.vertex) {
                //如果是编辑面板，一定不能连线
                tempGraphNode.setConnectable(false);
            } else {
                tempGraphNode.setConnectable(tempGraphNode.bigtype == EnxHelper.ModelType.Port || tempGraphNode.bigtype == EnxHelper.ModelType.Network ? true : false);
            }
            //禁止移动
            thisObj.SubGraph.SetNodeCannotMove();
            graph.cellRenderer.redrawLabel(graph.view.getState(tempGraphNode));
        }
        return tempGraphNode;
    };
    //右键菜单
    this.InitPopMenu = function() {
        //1. 注意多选和单选   2.分类型绑定（空白处、网元、线条、端口等） [先做线条事件]
        thisObj.Property.CoreGraph.popupMenuHandler.factoryMethod = function(menu, cell, evt) {
            var selectItems = thisObj.Property.CoreGraph.getSelectionCells(),
                addKey = function(item, key) {
                    $(item).find("td:last").html('<span class="mxMenu-key">' + key + "</span>");
                };
            //连线的特殊操作（主要是分组）
            if (cell && cell.edge) {
                //两端点相同的连线
                var sourceDeviceId = cell.source.id;
                var targetDeviceId = cell.target.id;
                var sameDoublePoint = $.grep(selectItems, function(selectCell, selectIndex) {
                    return selectCell.edge && selectCell.id != cell.id && (selectCell.source.id == sourceDeviceId && selectCell.target.id == targetDeviceId || selectCell.target.id == sourceDeviceId && selectCell.source.id == targetDeviceId);
                });
                //未分组的和已经分组的，只要同端点有其他连线就可以继续分组
                if (sameDoublePoint.length > 0) {
                    menu.addItem("Group", null, function() {
                        thisObj.CombineLinkToGroup(cell, sameDoublePoint, true);
                    }, null);
                }
                if (cell.group) {
                    //已经分组的，就展开
                    menu.addItem("UnGroup", null, function() {
                        thisObj.PullLinkFromGroup(cell);
                    }, null);
                }
            }
            if (cell && cell.vertex) {
                //如果是节点（跟节点只有一级设备）
                var item = menu.addItem("Copy", null, function() {
                    thisObj.Copy();
                }, null, "mxMenu copy");
                addKey(item, "Ctrl+C");
            }
            //通用操作，暂时只加删除
            if (selectItems.length > 0) {
                if (selectItems.length == 1) {
                    var item = menu.addItem("Edit", null, function() {
                        thisObj.PropertyPanel.EditNodeById(selectItems[0].id);
                    }, null, "mxMenu edit");
                    addKey(item, "Enter");
                }
                var item = menu.addItem("Delete", null, function() {
                    thisObj.RemoveSelectCell(selectItems);
                }, null, "mxMenu delete");
                addKey(item, "Del");
            } else {
                var item = menu.addItem("Select All", null, function() {
                    thisObj.selectAll();
                }, null, "mxMenu select");
                addKey(item, "Ctrl+A");
            }
            //粘贴
            if (!cell && !mxClipboard.isEmpty()) {
                var item = menu.addItem("Paste", null, function() {
                    thisObj.Paste();
                }, null, "mxMenu paste");
                addKey(item, "Ctrl+V");
            }
        };
    };
    //删除选中的节点
    this.RemoveSelectCell = function(deleteCells) {
        var selectLink = [];
        var selectDevice = [];
        //一、网元和连线的分类/清除缓存数据/级联操作资源树； （暂时来说，主画布不是链路就是顶层设备）
        $.each(deleteCells, function(index, cell) {
            if (cell.bigtype == EnxHelper.ModelType.Link) {
                selectLink.push(cell);
                //注意如果有分组，则删除整个分组
                if (cell.group) {
                    var sameGroupCell = thisObj.GetSameGroupLink(cell);
                    selectLink = selectLink.concat(sameGroupCell);
                }
            } else {
                selectDevice.push(cell);
                //删除连线缓存数据和树状数据
                var linksInCell = cell.edges;
                if (linksInCell) {
                    $.each(linksInCell, function(i, link) {
                        edit.RemoveModel(EnxHelper.Field.ID, link.id);
                    });
                }
                //删除子元件的缓存数据和树状数据
                edit.RemoveModelByParentId(cell.id, true);
            }
            //删除当前元件缓存数据
            edit.RemoveModel(EnxHelper.Field.ID, cell.id);
        });
        //三、画布中清除数据
        $.each(selectLink, function(index, link) {
            thisObj.RemoveLink(link, true);
        });
        thisObj.Property.CoreGraph.removeCells(selectDevice, true);
        thisObj.SubGraph.EditCell();
    };
    //通过ID，删除节点或者连线 （对外接口，主要用于树状数据中删除）
    this.RemoveCellById = function(type, id) {
        //ps:按照原来各其他的enx编辑工具，连线面板是不允许树状资源树操作的
        var graph = thisObj.Property.CoreGraph;
        var lst = [];
        switch (type) {
            case EnxHelper.ModelType.Link:
                //只可能是主画布，不需要遍历 （连线面板是不允许外部删除的）
                lst = this.GetAllLink(graph);
                break;

            case EnxHelper.ModelType.Ne:
            case EnxHelper.ModelType.Tester:
            case EnxHelper.ModelType.Sftp:
            case EnxHelper.ModelType.Agent:
            case EnxHelper.ModelType.Network:
            case EnxHelper.ModelType.Atm:
            case EnxHelper.ModelType.Eth:
            case EnxHelper.ModelType.Sdh:
                //只可能是主画布，不需要遍历
                lst = this.GetAllNode(graph);
                break;
        }
        if (!lst || lst.length == 0) {
            return;
        }
        var cell = JsonHelper.GetJsonByKey(lst, "id", id);
        if (cell.id) {
            if (type == EnxHelper.ModelType.Link) {
                //主画布的连线删除，需要重新绘制所有的兄弟连线
                thisObj.RemoveLink(cell);
            } else {
                graph.removeCells([cell]);
            }
        }
    };
    //获取相同分组的连线
    this.GetSameGroupLink = function(cell) {
        //获取同分组的节点
        var allLink = thisObj.GetAllLink(thisObj.Property.CoreGraph);
        var sameGroup = $.grep(allLink, function(selectCell, selectIndex) {
            return selectCell.edge && selectCell.group && selectCell.group == cell.group && selectCell.id != cell.id;
        });
        return sameGroup;
    };
    //设置节点属性，同步更新缓存数据
    this.SetNodeAttr = function(cell, fieldName, json) {
        var type = cell.bigtype;
        edit.SetNodeAttr(type, cell.id, fieldName, json);
        cell[fieldName] = json[EnxConstField.AttrName.ENXFILE_ATTR_VALUE];
    };
    //删除节点
    this.RemoveNodeAttr = function(cell, fieldName) {
        var type = cell.bigtype;
        edit.DeleteNodeAttr(type, cell.id, fieldName);
        delete cell[fieldName];
    };
    //根据基元连线cell，把同源连线sameDoublePoint分组 ,containGroup:同源连线中是否包含分组
    this.CombineLinkToGroup = function(cell, sameDoublePoint, containGroup) {
        if (sameDoublePoint && sameDoublePoint.length > 0) {
            //隐藏连线
            thisObj.Property.CoreGraph.toggleCells(false, sameDoublePoint);
            //分组名称
            var groupName = thisObj.CreateLinkGroupName(cell);
            var groupJson = EnxHelper.AttrParameter(thisObj.ConstInfo.AttrName.GROUP, groupName);
            //加入分组
            thisObj.PushLinkToGroup(cell, groupName);
            //同源/端节点 把分组名称设置为连线的名称
            $.each(sameDoublePoint, function(index, linkItem) {
                if (containGroup) {
                    var sameGroup = thisObj.GetSameGroupLink(linkItem);
                    if (sameGroup && sameGroup.length > 0) {
                        thisObj.PullLinkFromGroupStyle(linkItem);
                        $.each(sameGroup, function(index, sameGroupItem) {
                            thisObj.SetNodeAttr(sameGroupItem, thisObj.ConstInfo.AttrName.GROUP, groupJson);
                        });
                    }
                }
                thisObj.SetNodeAttr(linkItem, thisObj.ConstInfo.AttrName.GROUP, groupJson);
            });
        }
    };
    //把节点加入分组 （当前选中的节点）
    this.PushLinkToGroup = function(cell, groupName) {
        //更新缓存数据的值
        var groupJson = EnxHelper.AttrParameter(thisObj.ConstInfo.AttrName.GROUP, groupName);
        groupJson[EnxConstField.AttrName.ENXFILE_ATTR_GROUPSHOW] = "true";
        thisObj.SetNodeAttr(cell, thisObj.ConstInfo.AttrName.GROUP, groupJson);
        //当前节点 把分组名称设置为连线的名称
        thisObj.Property.CoreGraph.getModel().setValue(cell, groupName);
        //当前连线改变样式 setCellStyle  'strokeColor=#40d4e9;strokeWidth=4;'
        thisObj.Property.CoreGraph.setCellStyle(thisObj.ConstInfo.LinkGroupedStyle, [cell]);
        this.CopyLink(cell, true);
    };
    //连线拷贝 (主要是为了分组后直接是直线)
    this.CopyLink = function(cell, isRemoveSource) {
        if (isRemoveSource) {
            thisObj.Property.CoreGraph.removeCells([cell]);
        }
        this.InsertLink(cell.parent, cell.id, cell.value, cell.source, cell.target, cell.style, cell.data);
    };
    //插入单个连线,返回连线对象  由于连线有分组的概念，所以此处封装一下
    this.InsertLink = function(parent, id, value, source, target, style, data) {
        thisObj.Property.CoreGraph.removeListener(thisObj.ConnectHandler);
        this.Property.CoreGraph.getModel().beginUpdate();
        try {
            var tempGraphLink = thisObj.Property.CoreGraph.insertEdge(parent, id, value, source, target, style);
            this.AttachCell(tempGraphLink, data);
            if (data.group) {
                tempGraphLink.group = data.group.value ? data.group.value : "";
                if (!data.group.groupshow) {
                    thisObj.Property.CoreGraph.toggleCells(false, [tempGraphLink]);
                } else {
                    thisObj.Property.CoreGraph.getModel().setValue(tempGraphLink, data.group.value);
                    var style = thisObj.ConstInfo.LinkGroupedStyle;
                    if (tempGraphLink.source.id == tempGraphLink.target.id) {
                        style = thisObj.ConstInfo.LoopGroupLinkStyleName;
                    }
                    thisObj.Property.CoreGraph.setCellStyle(style, [tempGraphLink]);
                }
            } else {
                //如果是自连接，样式改变
                if (source.id == target.id) {
                    this.Property.CoreGraph.getModel().setStyle(tempGraphLink, thisObj.ConstInfo.LoopLinkStyleName);
                }
            }
        } finally {
            this.Property.CoreGraph.getModel().endUpdate();
        }
        thisObj.Property.CoreGraph.addListener(mxEvent.CELL_CONNECTED, thisObj.ConnectHandler);
        return tempGraphLink;
    };
    //顶层设备拷贝
    this.Copy = function() {
        var selectItemLst = thisObj.Property.CoreGraph.getSelectionCells();
        var selectNode = JsonHelper.FilterListByValues(selectItemLst, thisObj.ConstInfo.AttrName.VERTEX, [true]);
        mxClipboard.copy(thisObj.Property.CoreGraph, selectNode);
    };
    //顶层设备粘贴
    this.Paste = function() {
        var graph = thisObj.Property.CoreGraph,
            cells = graph.getImportableCells(mxClipboard.getCells());
        $.each(cells, function(index, cell) {
            //缓存中拷贝元素
            var jsonAndChild = edit.CopyModel(cell.data);
            if (jsonAndChild && jsonAndChild.length > 0) {
                $.each(jsonAndChild, function(i, json) {
                    if (i == 0) {
                        //首个是本身,需要往画布中插入网元
                        var bond = thisObj.Translater.GetJsonBond(json);
                        bond[0] = graph.popupMenuHandler.triggerX || bond[0] + 10;
                        bond[1] = graph.popupMenuHandler.triggerY || bond[1] + 10;
                        thisObj.Translater.JsonToCell(graph, json, graph.getDefaultParent(), bond, cell.style);
                    }
                });
            }
        });
    };
    this.selectAll = function() {
        thisObj.Property.CoreGraph.selectAll();
    };
    //把节点剥离分组 （当前选中的节点）
    this.PullLinkFromGroup = function(cell) {
        //获取同分组的节点
        var sameGroup = thisObj.GetSameGroupLink(cell);
        $.each(sameGroup, function(index, linkItem) {
            thisObj.RemoveNodeAttr(linkItem, thisObj.ConstInfo.AttrName.GROUP);
        });
        //显示同组连线
        thisObj.Property.CoreGraph.toggleCells(true, sameGroup);
        //样式和名称
        this.PullLinkFromGroupStyle(cell);
        //删除分组
        this.RemoveNodeAttr(cell, thisObj.ConstInfo.AttrName.GROUP);
    };
    //把节点分离分组的样式和名称变化
    this.PullLinkFromGroupStyle = function(cell) {
        var displayName = thisObj.GetDisplayNodeName(cell.data);
        thisObj.Property.CoreGraph.getModel().setValue(cell, displayName);
        //如果是自连接，样式改变
        if (cell.source.id == cell.target.id) {
            this.Property.CoreGraph.getModel().setStyle(cell, thisObj.ConstInfo.LoopLinkStyleName);
        } else {
            thisObj.Property.CoreGraph.setCellStyle(thisObj.ConstInfo.LinkUnGroupStyle, [cell]);
        }
    };
    //选中网元或者连线
    this.SelectItemHandle = function() {
        var rootNode = thisObj.Property.CoreGraph.getDefaultParent();
        var selectItemLst = thisObj.Property.CoreGraph.getSelectionCells();
        //有时间就加个是否改变的判断，不过一般情况下，只要选择操作做了，基本都会有差异
        //var oldSelectVertexId =[].concat(thisObj.Property.SelectedVertexId);
        //var oldSelectLinkId = [].concat(thisObj.Property.SelectedLinkId);
        thisObj.Property.SelectedVertexId = [];
        thisObj.Property.SelectedLinkId = [];
        $.each(selectItemLst, function(index, graphNode) {
            if (graphNode.vertex) {
                thisObj.Property.SelectedVertexId.push(graphNode[thisObj.ConstInfo.AttrName.ID]);
            }
            if (graphNode.edge) {
                thisObj.Property.SelectedLinkId.push(graphNode[thisObj.ConstInfo.AttrName.ID]);
                var sameGroup = thisObj.GetSameGroupLink(graphNode);
                $.each(sameGroup, function(index, sameGroupItem) {
                    thisObj.Property.SelectedLinkId.push(sameGroupItem[thisObj.ConstInfo.AttrName.ID]);
                });
            }
        });
    };
    //清除所有的子节点
    this.ClearChildren = function() {
        this.Property.LinkGroupIndex = 0;
        if (thisObj.Property.CoreGraph && thisObj.Property.CoreGraph.getModel() && thisObj.Property.CoreGraph.getModel().root) {
            thisObj.Property.CoreGraph.getModel().clear();
        }
    };
    //创建链路分组名称
    this.CreateLinkGroupName = function(cell) {
        var res = "";
        if (cell.group) {
            res = cell.group;
        } else {
            var res = this.ConstInfo.LinkGroupPre + this.Property.LinkGroupIndex;
            this.Property.LinkGroupIndex++;
        }
        return res;
    };
    //常量信息
    this.ConstInfo = new function() {
        //固定宽度 （后期再根据设备类型，适配对应的图片）
        this.FixWidth = 62;
        //固定高度
        this.FixHeight = 62;
        //节点的书名名称
        this.AttrName = {
            //父节点
            PARENT: "parent",
            //值
            VALUE: "value",
            //是否可连接
            CONNECTABLE: "connectable",
            //ID
            ID: "id",
            //源端
            SOURCE: "source",
            //样式
            STYLE: "style",
            //目的端
            TARGET: "target",
            //是否为端点
            VERTEX: "vertex",
            //位置信息
            GEOMETRY: "geometry",
            //是否连线
            EDGE: "edge",
            //分组信息 (自定义扩展字段)
            GROUP: "group",
            //名称字段 (自定义扩展字段)
            OBJNAME: "objname",
            //分类
            BIGTYPE: "bigtype",
            //数据
            DATA: "data",
            //当前元素在画布中的ID , 主画布的Id为组网id,子画布Id为网元ID（如果是连线面板就为连线的Id）；普通元素就是本身的Id
            CANVASID: "canvasID",
            //是否虚拟连线
            ISVIRTUALEDGE: "isVirtualEdge"
        };
        //链路分组名称前缀
        this.LinkGroupPre = "Group";
        //默认名称前缀
        this.ElemntNamePre = new function() {
            //链路起始索引
            this.Link = "link";
            //网元起始索引
            this.Ne = "ne";
            //测试仪起始索引
            this.Tester = "tester";
            this.Dev = "dev";
            //测试仪起始索引
            this.Atm = "atm";
            //测试仪起始索引
            this.Eth = "eth";
            //测试仪起始索引
            this.Sdh = "sdh";
            //单板起始索引
            this.Board = "board";
            //子卡起始索引
            this.SubBoard = "subboard";
            //端口起始索引
            this.Port = "port";
            //网络平面
            this.Network = "network";
            //Sftp
            this.Sftp = "sftp";
            //Agent执行机
            this.Agent = "agent";
            //VM
            this.VM = "vm";
        }();
        //链路分组后的样式
        this.LinkGroupedStyle = "strokeColor=#525ae9;strokeWidth=4;";
        //链路分组前的样式
        this.LinkUnGroupStyle = "strokeColor=#009b4d;strokeWidth=2;";
        //泳道样式
        this.SwimStyle = "shape=swimlane;startSize=30;fillColor=#f6f6f6;strokeColor=#f6f6f6;fontColor=#333;";
        //占用的样式
        this.UsedPort = "shape=swimlane;startSize=30;fillColor=#f6f6f6;strokeColor=#f6f6f6;fontColor=#999;";
        //连线的默认颜色
        this.LineDefualtColor = "#a5a5a5";
        //链路分组后的样式
        this.LoopGroupLinkStyleName = "LoopGroupLinkStyleName";
        //主画布上自连接的样式名称
        this.LoopLinkStyleName = "LoopLinkInCoreGraph";
        //主画布上自连接分组的样式名称
        this.LoopGroupLinkInCoreGraph = "LoopGroupLinkInCoreGraph";
        //主画布上虚拟连接的样式名称
        this.VirtualLinkStyleName = "VirtualLinkStyleName";
        //子画布
        this.SubGraphHtml = '<div id="graphContainer"></div>';
        //编辑模式，是组网编辑还是内部元素编辑
        this.EnumEditType = {
            Topo: "Topo",
            Element: "Element",
            Network: "Network"
        };
    }();
    //当前的编辑类型
    this.EditType = this.ConstInfo.EnumEditType.Topo;
    //执行初始化
    this.Init();
};