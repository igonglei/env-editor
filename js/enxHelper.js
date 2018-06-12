/*!
 * enxHelper - helper library for envEditor
 * Author, Gonglei & blake_cai
 */
(function(root, factory) {
    "use strict";
    if (typeof define === "function" && define.amd) {
        // AMD
        define(["jquery"], factory);
    } else if (typeof module === "object" && typeof module.exports === "object") {
        // CommonJS
        module.exports = factory(require("jquery"));
    } else {
        // Browser globals
        root.enxHelper = factory(root.jQuery);
    }
})(this, function($) {
    //一、Enx文件转换帮助类，Enx和Json列表的互相转化
    var EnxHelper = new function() {
        var self = this;
        //全局变量
        this.GlobalVar = new function() {
            //XML标签去除
            this.XMLTAG = "<\\?xml.*\\?>";
            //空节点标识
            this.ExceptionNode = "#text";
            //参数标签paramter的非法标签
            this.IllegalTagEnd = "/>";
            //参数标签paramter的合法标签
            this.LawfulTagEnd = "></parameter>";
            //连线标签的原标签（会解析掉）
            this.LinkTag = "link>";
            //连线标签的替换标签
            this.LinkTagReplace = "linkC>";
            //插件自定义的非XML的字段
            this.UserDefineField = [];
            //父子标签的空格间隔
            this.SpaceCount = 2;
            //一些特殊的标签的模板
            this.FormatTpl = new function() {
                //这是个单标签
                this.Paratemter = "<parameter{0}/>";
                //link标签会被解析掉
                this.Link = "<link>{0}</link>";
                //Toplimit里面的cdata
                this.CDATA = "<![CDATA[{0}]]>";
            }();
            //元素的起始索引
            this.ElemntIndex = new function() {
                //链路起始索引
                this.Link = 1;
                //网元起始索引
                this.Ne = 1;
                //单板起始索引
                this.Board = 1;
                //子卡起始索引
                this.SubBoard = 1;
                //端口起始索引
                this.Port = 1;
                //测试仪起始索引
                this.Tester = 1;
                //测试仪起始索引
                this.Dev = 1;
                //测试仪起始索引
                this.Atm = 1;
                //测试仪起始索引
                this.Eth = 1;
                //测试仪起始索引
                this.Sdh = 1;
                //Sftp起始索引
                this.Sftp = 1;
                //执行机起始索引
                this.Agent = 1;
                //VM起始索引
                this.VM = 1;
                //Network网络平面起始索引
                this.Network = 1;
            }();
            //元素的起始索引
            this.DeaultElemntIndex = new function() {
                //链路起始索引
                this.Link = 1;
                //网元起始索引
                this.Ne = 1;
                //单板起始索引
                this.Board = 1;
                //子卡起始索引
                this.SubBoard = 1;
                //端口起始索引
                this.Port = 1;
                //测试仪起始索引
                this.Tester = 1;
                //测试仪起始索引
                this.Dev = 1;
                //测试仪起始索引
                this.Atm = 1;
                //测试仪起始索引
                this.Eth = 1;
                //测试仪起始索引
                this.Sdh = 1;
                //Sftp起始索引
                this.Sftp = 1;
                //执行机起始索引
                this.Agent = 1;
                //VM起始索引
                this.VM = 1;
                //Network网络平面起始索引
                this.Network = 1;
            }();
        }();
        //附加字段名称 (自己定义的，非xml文件的)
        this.Field = {
            ID: "_id",
            BigType: "BigType",
            ParentGID: "ParentGID",
            //是否为顶层设备
            IsTopDevice: "IsTopDevice",
            Name: "Name"
        };
        //定制处理的字段
        this.SpecialField = {
            //定制批量更新需要
            IP: "ip"
        };
        //模型的类别
        this.ModelType = {
            ///环境
            Env: "Env",
            /// 网元
            Ne: "Ne",
            /// 单板
            Board: "Board",
            /// 子卡
            SubBoard: "SubBoard",
            /// 端口
            Port: "Port",
            /// 链路
            Link: "Link",
            /// Topolimit
            Topolimit: "Topolimit",
            /// Tester测试仪
            Tester: "Tester",
            /// Dev测试仪
            Dev: "Dev",
            /// Atm测试仪
            Atm: "Atm",
            /// Eth测试仪
            Eth: "Eth",
            /// Sdh测试仪
            Sdh: "Sdh",
            /// Network 网络平面
            Network: "Network",
            /// Sftp
            Sftp: "Sftp",
            /// Agent执行机
            Agent: "Agent",
            /// VM 
            VM: "VM",
            /// Other 
            Other: "Other"
        };
        //顶层设备的类型
        this.ModelTypeOfTopDevice = [this.ModelType.Ne, this.ModelType.Atm, this.ModelType.Tester, this.ModelType.Dev, this.ModelType.Eth, this.ModelType.Sdh, this.ModelType.Network, this.ModelType.Sftp, this.ModelType.Agent];
        //重置最大索引
        this.ResetMaxIndex = function(type, name) {
            var res = name.match(new RegExp("0|[1-9]\\d*", "gm"));
            if (res && res.length > 0) {
                if (this.GlobalVar.ElemntIndex[type] <= parseInt(res[res.length - 1])) {
                    this.GlobalVar.ElemntIndex[type] = parseInt(res[res.length - 1]) + 1;
                }
            }
        };
        //预处理xml内容
        this.PreDealEnxContent = function(strEnxContent) {
            return strEnxContent.replace(new RegExp(this.GlobalVar.XMLTAG, "gm"), "").replace(new RegExp(self.GlobalVar.IllegalTagEnd, "gm"), self.GlobalVar.LawfulTagEnd).replace(new RegExp(self.GlobalVar.LinkTag, "gm"), self.GlobalVar.LinkTagReplace);
        };
        //Enx文件转Json列表 
        this.EnxToLstJson = function(strEnxContent) {
            var thisObj = this;
            //重置索引
            this.GlobalVar.ElemntIndex = this.GlobalVar.DeaultElemntIndex;
            var result = [];
            if (!strEnxContent) {
                return result;
            }
            //预处理xml内容，把非法标签都处理掉
            var dealedContent = this.PreDealEnxContent(strEnxContent);
            //根节点
            var rootNode = $(dealedContent)[0];
            var rootNodeJson = {};
            rootNodeJson[EnxConstField.RootNodeAttr] = self.GetNodeAttr(rootNode);
            //一层子节点
            var firstLevelNodes = self.GetChildNode(rootNode);
            $.each(firstLevelNodes, function(index, currenNode) {
                switch (currenNode.tagName) {
                    //组网基本参数解析
                    case EnxConstField.NodeName.ENXFILE_NODE_PARAMETERS:
                        var basicEnvInfo = self.ParameterNodeToJson(currenNode);
                        rootNodeJson = JsonHelper.CombineJson(basicEnvInfo, rootNodeJson);
                        result.push(rootNodeJson);
                        break;

                        //设备
                    case EnxConstField.NodeName.ENXFILE_NODE_DEVICES:
                        var deviceNodes = self.GetChildNode(currenNode);
                        $(deviceNodes).each(function(index, deviceNode) {
                            var tempDeviceLst = self.DeviceNodeToJson(deviceNode, rootNodeJson, true);
                            result = result.concat(tempDeviceLst);
                        });
                        break;

                        //连线
                    case EnxConstField.NodeName.ENXFILE_NODE_LINKS:
                        var linkNodes = self.GetChildNode(currenNode);
                        $(linkNodes).each(function(index, value) {
                            var linkJson = self.LinkNodeToJson(value);
                            if (linkJson && linkJson.objname && linkJson.objname.value) {
                                linkJson[self.Field.ParentGID] = JsonHelper.GetStrValue(rootNodeJson, self.Field.ID);
                                result.push(linkJson);
                                thisObj.ResetMaxIndex(self.ModelType.Link, linkJson.objname.value);
                            }
                        });
                        break;

                        //Toplimit
                    case EnxConstField.NodeName.ENXFILE_NODE_TOPOLIMIT:
                        var limit = {};
                        limit[self.Field.BigType] = self.ModelType.Topolimit;
                        limit[self.Field.ParentGID] = JsonHelper.GetStrValue(rootNodeJson, self.Field.ID);
                        //此处注意正则替换
                        limit[self.Field.Name] = self.MatchTopLimit($.trim(currenNode.innerHTML));
                        limit[self.Field.ID] = self.CreateNewGuid();
                        result.push(limit);
                        break;
                }
            });
            return result;
        };
        //Json列表转Enx文件
        this.LstJsonToEnx = function(lstJson) {
            if (!lstJson || lstJson.length == 0) {
                return "";
            }
            var xmlContent = $(EnxConstField.XMLTAG.LOGIC_ENVIRONMENT);
            //01 寻找环境节点；
            var rootNode = JsonHelper.GetJsonByKey(lstJson, self.Field.BigType, self.ModelType.Env);
            //如果为空，创建一个环境属性值
            if (!JsonHelper.IsJsonObj(rootNode) || JsonHelper.IsEmptyJson(rootNode) || !rootNode) {
                rootNode = self.ParameterNodeToJson(null);
            }
            //01.01解析属性
            var rootNodeAttr = rootNode[EnxConstField.RootNodeAttr];
            for (var key in rootNodeAttr) {
                xmlContent.attr(key, JsonHelper.GetStrValue(rootNodeAttr, key));
            }
            //01.02 反向解析基本参数
            var rootParametersContent = $(EnxConstField.XMLTAG.PARAMETERSTAG);
            rootParametersContent[0].innerText = self.XmlGetParameter(rootNode, true);
            xmlContent.append(rootParametersContent);
            //02 寻找环境节点下的所有子节点；
            //02.02 反向解析设备
            self.XMLJsonToNode(rootNode, xmlContent, lstJson);
            //02.03 反向解析链路 (</link> 注意此标签会被自动解析掉)
            var linksContent = $(EnxConstField.XMLTAG.LINKS);
            var linkChildNodes = JsonHelper.FilterListByValues(lstJson, self.Field.BigType, [self.ModelType.Link]);
            var strLinkTag = "";
            $.each(linkChildNodes, function(index, linkNode) {
                strLinkTag += self.Format(self.GlobalVar.FormatTpl.Link, self.XmlGetParameter(linkNode));
            });
            linksContent[0].innerText = strLinkTag;
            xmlContent.append(linksContent);
            //02.04 反向解析toplimit
            var topLimitNode = JsonHelper.GetJsonByKey(lstJson, self.Field.BigType, self.ModelType.Topolimit);
            var topLimitContent = $(EnxConstField.XMLTAG.TOPOLIMIT);
            topLimitContent[0].innerText = self.Format(self.GlobalVar.FormatTpl.CDATA, topLimitNode[self.Field.Name] || "");
            xmlContent.append(topLimitContent);
            var result = xmlContent[0].outerHTML;
            return result;
        };
        //XML构造parameter标签 (此处注意两点，（1）：parameter标签是单标签  （2）：只能字符串拼接，直接属性会导致顺序改变)
        this.XmlGetParameter = function(json, isReverse) {
            if (this.GlobalVar.UserDefineField.length == 0) {
                this.GlobalVar.UserDefineField = JsonHelper.GetJsonAllValue(self.Field);
                this.GlobalVar.UserDefineField.push(EnxConstField.RootNodeAttr);
            }
            //遍历JSON所有属性
            var innerParameterStr = "";
            for (var key in json) {
                if (this.GlobalVar.UserDefineField.indexOf(key) < 0) {
                    var jsonAttr = json[key];
                    // var strJson = JSON.stringify(jsonAttr);  //测试查看json的顺序
                    var attrStr = "";
                    //遍历属性值中的所有字段属性
                    for (var keyItem in jsonAttr) {
                        var attrValue = this.DealSpecialSingal(jsonAttr[keyItem]);
                        attrStr += " " + keyItem + '="' + attrValue + '"';
                    }
                    var str = self.Format(self.GlobalVar.FormatTpl.Paratemter, attrStr);
                    innerParameterStr += str;
                }
            }
            return innerParameterStr;
        };
        //值中的双引号、<、>、&等XML特殊字符处理
        this.DealSpecialSingal = function(str) {
            if (str == undefined || str == null || !str) {
                return str;
            }
            if (str.indexOf('"') > -1) {
                str = str.replace(new RegExp('"', "gm"), "★");
            }
            if (str.indexOf("&") > -1) {
                str = str.replace(new RegExp("&", "gm"), "♣");
            }
            if (str.indexOf("<") > -1) {
                str = str.replace(new RegExp("<", "gm"), "◀");
            }
            if (str.indexOf(">") > -1) {
                str = str.replace(new RegExp(">", "gm"), "▶");
            }
            return str;
        };
        //XML中构造设备节点 parentJson：父节点json数据，父节点元素
        this.XMLJsonToNode = function(parentJson, parentNode, lstJson) {
            var parentId = JsonHelper.GetStrValue(parentJson, self.Field.ID);
            //获取子设备节点
            var childNodes = [];
            if (parentJson.BigType == self.ModelType.Env) {
                //如果父节点是环境节点，则直接取顶层设备
                childNodes = JsonHelper.FilterListByValues(lstJson, self.Field.IsTopDevice, [EnxConstField.BoolStr.Yes]);
            } else {
                childNodes = JsonHelper.FilterListByValues(lstJson, self.Field.ParentGID, [parentId]);
            }
            if (childNodes && childNodes.length > 0) {
                //02.02 反向解析设备
                var devicesContent = $(EnxConstField.XMLTAG.DEVICES);
                $.each(childNodes, function(index, childNode) {
                    var deviceContent = $(EnxConstField.XMLTAG.DEVICE);
                    var parametersConten = $(EnxConstField.XMLTAG.PARAMETERSTAG);
                    var parameter = self.XmlGetParameter(childNode);
                    parametersConten[0].innerText = parameter;
                    deviceContent.append(parametersConten);
                    self.XMLJsonToNode(childNode, deviceContent, lstJson);
                    devicesContent.append(deviceContent);
                });
                parentNode.append(devicesContent);
            }
        };
        //获取用户自定字段（尽量去一次就好）
        this.GetUserDefineField = function() {};
        //解析链接节点
        this.LinkNodeToJson = function(linkNode) {
            var result = {};
            var paramNodes = self.GetChildNode(linkNode);
            $.each(paramNodes, function(index, paramNode) {
                var fieldName = $(paramNode).attr(EnxConstField.AttrName.ENXFILE_ATTR_NAME);
                if (fieldName) {
                    result[self.Field.BigType] = self.ModelType.Link;
                    result[fieldName] = self.GetNodeAttr(paramNode);
                }
            });
            this.NodeAttachFieldId(result);
            return result;
        };
        //为节点附加id，如果有guid则，_id=guid
        this.NodeAttachFieldId = function(nodeJson) {
            var guidJson = JsonHelper.GetJsonValue(nodeJson, EnxConstField.AttrName.ENXFILE_ATTR_GUID);
            var guidValue = JsonHelper.GetStrValue(guidJson, EnxConstField.AttrName.ENXFILE_ATTR_VALUE);
            var idValue = guidValue ? guidValue : self.CreateNewGuid();
            nodeJson[self.Field.ID] = idValue;
        };
        //解析参数节点
        this.ParameterNodeToJson = function(paramNode) {
            var result = {};
            result[self.Field.BigType] = self.ModelType.Env;
            var paramNodes = self.GetChildNode(paramNode);
            $.each(paramNodes, function(index, tempParamNode) {
                var fieldName = $(tempParamNode).attr(EnxConstField.AttrName.ENXFILE_ATTR_NAME);
                //获取参数节点的所有属性
                result[fieldName] = self.GetNodeAttr(tempParamNode);
            });
            this.NodeAttachFieldId(result);
            return result;
        };
        //解析设备节点
        this.DeviceNodeToJson = function(deviceNode, parentNodeJson, isTopDevice) {
            var result = [];
            var curDevice = {};
            curDevice[self.Field.ParentGID] = parentNodeJson[self.Field.ID] || "";
            curDevice[self.Field.IsTopDevice] = isTopDevice ? EnxConstField.BoolStr.Yes : EnxConstField.BoolStr.No;
            var childrenDevice = [];
            var childrenNodes = self.GetChildNode(deviceNode);
            $.each(childrenNodes, function(index, childNode) {
                var tagName = childNode.tagName;
                var grandsonNodes = self.GetChildNode(childNode);
                switch (tagName) {
                    //解析子设备
                    case EnxConstField.NodeName.ENXFILE_NODE_DEVICES:
                        $.each(grandsonNodes, function(index, grandsonNode) {
                            var tempGrandsonNodes = self.DeviceNodeToJson(grandsonNode, curDevice);
                            childrenDevice = childrenDevice.concat(tempGrandsonNodes);
                        });
                        break;

                        //解析参数
                    case EnxConstField.NodeName.ENXFILE_NODE_PARAMETERS:
                        $.each(grandsonNodes, function(index, grandsonNode) {
                            var fieldName = $(grandsonNode).attr(EnxConstField.AttrName.ENXFILE_ATTR_NAME);
                            if (fieldName == EnxConstField.AttrName.ENXFILE_ATTR_CLASS) {
                                var className = $(grandsonNode).attr(EnxConstField.AttrName.ENXFILE_ATTR_VALUE);
                                curDevice[self.Field.BigType] = self.GetDeviceType(className);
                            }
                            curDevice[fieldName] = self.GetNodeAttr(grandsonNode);
                        });
                        if (curDevice.objname.value == "ne1_board1_subboard1_port1") {
                            var gg = "";
                        }
                        self.NodeAttachFieldId(curDevice);
                        break;
                }
            });
            if (curDevice.objname) {
                this.ResetMaxIndex(curDevice[self.Field.BigType], curDevice.objname.value);
                result.push(curDevice);
                result = result.concat(childrenDevice);
            }
            return result;
        };
        //匹配toplimit内容
        this.MatchTopLimit = function(strCdata) {
            return strCdata.replace("<!--[CDATA[", "").replace("]]-->", "");
        };
        //附加类型(Enx的类型存在合并的情况)
        this.GetDeviceType = function(className) {
            var bigType = "";
            switch (className) {
                case EnxConstField.SpecialName.ENXFILE_SPECIAL_TESTERTYPE:
                    bigType = self.ModelType.Tester;
                    break;

                case EnxConstField.SpecialName.ENXFILE_SPECIAL_DEVTYPE:
                    bigType = self.ModelType.Dev;
                    break;

                case EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPEATM:
                    bigType = self.ModelType.Atm;
                    break;

                case EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPEETH:
                    bigType = self.ModelType.Eth;
                    break;

                case EnxConstField.SpecialName.ENXFILE_SPECIAL_UNKOWNTYPESDH:
                    bigType = self.ModelType.Sdh;
                    break;

                default:
                    bigType = className;
                    break;
            }
            return bigType;
        };
        //获取节点的属性
        this.GetNodeAttr = function(node) {
            var paramAttrs = node.attributes;
            var arrParamAttrs = $.makeArray(paramAttrs);
            arrParamAttrs.sort(function(a, b) {
                return EnxConstField.AttrDic[a.name] - EnxConstField.AttrDic[b.name];
            });
            var fieldJson = {};
            //遍历属性获取值
            $.each(arrParamAttrs, function(index, value) {
                fieldJson[value.name] = value.value;
            });
            return fieldJson;
        };
        //生成随机的guid
        this.CreateNewGuid = function() {
            var guid = "";
            for (var i = 1; i <= 32; i++) {
                var n = Math.floor(Math.random() * 16).toString(16);
                guid += n;
                if (i == 8 || i == 12 || i == 16 || i == 20) guid += "-";
            }
            return guid;
        };
        //格式化字符串
        this.Format = function(source, params) {
            if (arguments.length == 1) return function() {
                var args = $.makeArray(arguments);
                args.unshift(source);
                return self.Format.apply(this, args);
            };
            if (arguments.length > 2 && params.constructor != Array) {
                params = $.makeArray(arguments).slice(1);
            }
            if (params.constructor != Array) {
                params = [params];
            }
            $.each(params, function(i, n) {
                source = source.replace(new RegExp("\\{" + i + "\\}", "g"), n);
            });
            return source;
        };
        //获取XML的子节点(主要是为了去掉异常的节点)
        this.GetChildNode = function(node) {
            var result = [];
            if (node && node.childNodes) {
                $.each(node.childNodes, function(index, childNode) {
                    if (childNode.nodeName != self.GlobalVar.ExceptionNode) {
                        result.push(childNode);
                    }
                });
            }
            return result;
        };
        //获取参数
        this.GetQueryString = function(name) {
            var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
            var r = window.location.search.substr(1).match(reg);
            if (r != null) return unescape(r[2]);
            return null;
        };
        //属性参数对象
        this.AttrParameter = function(fieldname, fieldvalue) {
            var obj = {};
            obj[EnxConstField.AttrName.ENXFILE_ATTR_NAME] = fieldname;
            obj[EnxConstField.AttrName.ENXFILE_ATTR_VALUE] = fieldvalue ? fieldvalue : "";
            return obj;
        };
    }();
    //二、Enx文件中各元素的常量
    var EnxConstField = new function() {
        //根节点的基本属性
        this.RootNodeAttr = "rootNodeAttr";
        //节点命名常量
        this.NodeName = {
            ENXFILE_NODE_DEVICES: "DEVICES",
            ENXFILE_NODE_LINKS: "LINKS",
            ENXFILE_NODE_TOPOLIMIT: "TOPOLIMIT",
            ENXFILE_NODE_LINK: "LINK",
            ENXFILE_NODE_DEVICE: "DEVICE",
            ENXFILE_NODE_PARAMETER: "PARAMETER",
            ENXFILE_NODE_PARAMETERS: "PARAMETERS"
        };
        //属性命名常量
        this.AttrName = {
            ENXFILE_ATTR_NAME: "name",
            ENXFILE_ATTR_OBJNAME: "objname",
            ENXFILE_ATTR_VALUE: "value",
            ENXFILE_ATTR_GROUPSHOW: "groupshow",
            ENXFILE_ATTR_CLASS: "class",
            ENXFILE_ATTR_SOURCETOPDEVICENAME: "sourcetopdevicename",
            ENXFILE_ATTR_TARGETTOPDEVICENAME: "targettopdevicename",
            ENXFILE_ATTR_SOURCEDEVICEID: "sourcedeviceid",
            ENXFILE_ATTR_TARGETDEVICEID: "targetdeviceid",
            ENXFILE_ATTR_GUID: "guid",
            ENXFILE_ATTR_ROLER: "roler",
            ENXFILE_ATTR_CLASS: "class",
            ENXFILE_ATTR_FULLCLASS: "fullclass",
            ENXFILE_ATTR_POSITION: "position",
            ENXFILE_ATTR_INTERFACE: "interface"
        };
        //特殊设备类型
        this.SpecialName = {
            ENXFILE_SPECIAL_TESTERTYPE: "Instru::Tester",
            ENXFILE_SPECIAL_DEVTYPE: "Instru::Dev",
            ENXFILE_SPECIAL_UNKOWNTYPEETH: "Instru::Eth::Chassis",
            ENXFILE_SPECIAL_UNKOWNTYPEATM: "Instru::Atm::Chassis",
            ENXFILE_SPECIAL_UNKOWNTYPESDH: "Instru::Sdh",
            ENXFILE_SPECIAL_UNKOWNTYPECONNECT: "Connect"
        };
        //XML标签
        this.XMLTAG = new function() {
            //组网节点标签
            this.LOGIC_ENVIRONMENT = "<logic_environment></logic_environment>";
            //参数列表标签
            this.PARAMETERSTAG = "<parameters></parameters>";
            //设备列表标签
            this.DEVICES = "<devices></devices>";
            //链路标签
            this.LINKS = "<links></links>";
            //topolimit标签
            this.TOPOLIMIT = "<topolimit></topolimit>";
            //设备标签
            this.DEVICE = "<device></device>";
            //链路标签
            this.LINK = "<link></link>";
            //参数标签
            this.PARAMETER = "<parameter/>";
        }();
        //XML标签属性的字典
        this.AttrDic = {
            name: 10,
            value: 11,
            notnull: 12,
            visible: 13,
            readonly: 14,
            description: 15,
            version: 16
        };
        //布尔字符创
        this.BoolStr = {
            Yes: "yes",
            No: "no"
        };
        //名称分隔
        this.NameSeparate = "_";
        //名称指向
        this.NamePoint = "to";
        //类分隔
        this.ClassSeparate = "::";
    }();
    //三、一些常用的json数据的处理
    var JsonHelper = new function() {
        //设置键值对应的Json (定制的方法)
        this.SetJsonByKey = function(arrJson, nameKey, valueKey, json, enumType) {
            var resJson = {};
            if (arrJson && arrJson.length > 0) {
                for (var i = 0; i < arrJson.length; i++) {
                    var Item = arrJson[i];
                    if (this.IsContainKey(json, Item[nameKey])) {
                        Item[valueKey] = enumType[json[Item[nameKey]].toString()];
                    } else {
                        Item[valueKey] = enumType["default"];
                    }
                }
            }
            return resJson;
        };
        //根据键值获取对应的Json
        this.GetJsonByKey = function(arrJson, fieldName, fieldValue) {
            var resJson = {};
            if (arrJson && arrJson.length > 0) {
                for (var i = 0; i < arrJson.length; i++) {
                    var Item = arrJson[i];
                    if (Item[fieldName] == fieldValue) {
                        resJson = Item;
                        break;
                    }
                }
            }
            return resJson;
        };
        //根据键值获取对应的Json
        this.GetJsonByKeyAndSecondKey = function(arrJson, fieldName, secondKey, fieldValue) {
            var resJson = {};
            if (arrJson && arrJson.length > 0) {
                for (var i = 0; i < arrJson.length; i++) {
                    var Item = arrJson[i];
                    if (Item[fieldName][secondKey] == fieldValue) {
                        resJson = Item;
                        break;
                    }
                }
            }
            return resJson;
        };
        //获取Json的值列表
        this.GetJsonKeyList = function(json) {
            var arrKey = [];
            for (var key in json) {
                arrKey.push(json[key]);
            }
            return arrKey;
        };
        //Json转换为Json数组
        this.ParseJsonToArr = function(json) {
            var arrKey = [];
            for (var key in json) {
                var newJson = {
                    Name: key,
                    Value: json[key]
                };
                arrKey.push(newJson);
            }
            return arrKey;
        };
        //获取json中的所有值
        this.GetJsonAllValue = function(json) {
            var arrKey = [];
            for (var key in json) {
                arrKey.push(json[key]);
            }
            return arrKey;
        };
        //获取json中的所有值
        this.GetJsonAllKey = function(json) {
            var arrKey = [];
            for (var key in json) {
                arrKey.push(key);
            }
            return arrKey;
        };
        //Copy Json
        this.CopyJson = function(json) {
            var res = {};
            if (json) {
                var strJson = $.toJSON(json);
                res = this.strJsonToJsonObj(strJson);
            }
            return res;
        };
        //判断Json是否为空或者没有键值
        this.IsEmptyJson = function(json) {
            var isEmpty = true;
            if (json) {
                for (var key in json) {
                    isEmpty = false;
                    if (!isEmpty) {
                        break;
                    }
                }
            }
            return isEmpty;
        };
        //判断Json是否包含Key
        this.IsContainKey = function(json, jsonKey) {
            var isContain = false;
            if (json) {
                for (var key in json) {
                    if (key == jsonKey) {
                        isContain = true;
                        break;
                    }
                }
            }
            return isContain;
        };
        //List<string> 转换为List<json>
        this.ParseArrStrToArrJson = function(arrStr) {
            var arrResJson = [];
            if (arrStr && arrStr.length > 0) $(arrStr).each(function(index, value) {
                arrResJson.push(JSON.parse(value));
            });
            return arrResJson;
        };
        //数组是否包含字符串
        this.IsArrStrContain = function(arrStr, str) {
            var isContain = false;
            if (arrStr && arrStr.length > 0) {
                for (var i = 0; i < arrStr.length; i++) {
                    var arrItem = arrStr[i];
                    if (arrItem == str) {
                        isContain = true;
                        break;
                    }
                }
            }
            return isContain;
        };
        //json字符串转换为Json
        this.strJsonToJsonObj = function(str) {
            var json = new Function("return " + str)();
            return json;
        };
        //根据键获取值列表
        this.GetListValueByKey = function(arrJson, key) {
            var arrField = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                arrField.push(value[key]);
            });
            return arrField;
        };
        //根据键获取值列表
        this.GetListValueByKey2 = function(arrJson, key, secondKey) {
            var arrField = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                arrField.push(JsonHelper.GetJsonValue(JsonHelper.GetJsonValue(value, key), secondKey));
            });
            return arrField;
        };
        //更新Json数组中的某个json
        this.JsonArrUpdate = function(arrJson, key, newJson) {
            var thisObj = this;
            var arrResJson = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                if (value[key] == newJson[key]) {
                    arrResJson.push(thisObj.CombineJson(value, newJson));
                } else {
                    arrResJson.push(value);
                }
            });
            return arrResJson;
        };
        //批量更新Json数组中的某个json(两层)
        this.JsonArrBatchUpdate = function(arrJson, key, valueFiledName, valueList, newJson) {
            var thisObj = this;
            var arrResJson = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                var jsonValue = value[key];
                if (valueList.indexOf(jsonValue) > -1) {
                    for (var tempKey in newJson) {
                        value[tempKey][valueFiledName] = newJson[tempKey];
                    }
                }
                arrResJson.push(value);
            });
            return arrResJson;
        };
        //单个更新Json数组中的某个json(两层,查询是单层)
        this.JsonArrSingleUpdate = function(arrJson, key, valueFiledName, keyValue, newJson, callback) {
            var updatedResult = {};
            var beforeUpdate = {};
            if (arrJson && arrJson.length > 0)
                for (var i = 0; i < arrJson.length; i++) {
                    var jsonItem = arrJson[i];
                    var jsonValue = jsonItem[key];
                    if (keyValue == jsonValue) {
                        beforeUpdate = JSON.parse(JSON.stringify(jsonItem));
                        for (var tempKey in newJson) {
                            if (!jsonItem[tempKey]) {
                                jsonItem[tempKey] = {
                                    name: tempKey,
                                    value: newJson[tempKey]
                                };
                            }
                            jsonItem[tempKey][valueFiledName] = newJson[tempKey];
                            //路由器特定需求，objname和name保持一致
                            if (tempKey == EnxConstField.AttrName.ENXFILE_ATTR_OBJNAME) {
                                jsonItem[EnxConstField.AttrName.ENXFILE_ATTR_NAME][valueFiledName] = newJson[tempKey];
                            }
                        }
                        updatedResult = jsonItem;
                        break;
                    }
                }
            callback && callback(beforeUpdate, updatedResult);
            return updatedResult;
        };
        //单个更新Json数组中的某个json(两层，查询时第二层)
        this.JsonArrSingleUpdate2 = function(arrJson, key, valueFiledName, keyValue, newJson) {
            if (arrJson && arrJson.length > 0)
                for (var i = 0; i < arrJson.length; i++) {
                    var jsonItem = arrJson[i];
                    var jsonValue = jsonItem[key][valueFiledName];
                    if (keyValue == jsonValue) {
                        for (var tempKey in newJson) {
                            jsonItem[tempKey][valueFiledName] = newJson[tempKey];
                        }
                        break;
                    }
                }
        };
        //删除Json数组中的某个json
        this.JsonArrDelete = function(arrJson, key, keyValue) {
            var arrResJson = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                if (value[key] != keyValue) {
                    arrResJson.push(value);
                }
            });
            return arrResJson;
        };
        //合并Json:用destJson的键值覆盖sourceJson的键值
        this.CombineJson = function(sourceJson, destJson) {
            var tempJson = sourceJson;
            if (destJson) {
                for (var key in destJson) {
                    tempJson[key] = destJson[key];
                }
            }
            return tempJson;
        };
        //其他 (根据某个字段的值列表过滤Json列表) 
        this.FilterListByValues = function(arrJson, key, arrValue) {
            var arrResJson = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                for (var j = 0; j < arrValue.length; j++) {
                    if (value[key] == arrValue[j]) {
                        arrResJson.push(value);
                        break;
                    }
                }
            });
            return arrResJson;
        };
        //排除包含值的元素
        this.ExceptListByValues = function(arrJson, key, arrValue) {
            var arrResJson = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                var isContain = false;
                for (var j = 0; j < arrValue.length; j++) {
                    if (value[key] == arrValue[j]) {
                        isContain = true;
                        break;
                    }
                }
                if (!isContain) {
                    arrResJson.push(value);
                }
            });
            return arrResJson;
        };
        //Json数组复制
        this.CopyArr = function(arrJson) {
            var thisObj = this;
            var arrResJson = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                arrResJson.push(thisObj.strJsonToJsonObj($.toJSON(value)));
            });
            return arrResJson;
        };
        //根据键获取值列表(双层json)
        this.GetListValueByDoubleKey = function(arrJson, key, seacondKey) {
            var arrField = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                var firstLevel = value[key] || {};
                arrField.push(firstLevel[seacondKey] || "");
            });
            return arrField;
        };
        //数组模糊匹配 type 0:表示头部匹配，1：全文匹配， 2：尾部匹配 
        this.FilterArr = function(arrStr, searchKey, type) {
            var lstResult = [];
            var paraFiledValue = searchKey ? searchKey : "";
            if (arrStr && arrStr.length > 0) {
                for (var i = 0; i < arrStr.length; i++) {
                    var Item = arrStr[i];
                    var flag = false;
                    switch (type) {
                        case 0:
                            flag = Item.indexOf(paraFiledValue) == 0;
                            break;

                        case 1:
                            flag = Item.length - paraFiledValue.length == Item.lastIndexOf(paraFiledValue);
                            break;

                        case 2:
                            flag = paraFiledValue == Item;
                            break;

                        default:
                            break;
                    }
                    if (flag) {
                        lstResult.push(Item);
                    }
                }
            }
            return lstResult;
        };
        //把数组转换为对应的json数组，keyName：键字段的名称, valueName:值字段的名称
        this.StrArrToJsonList = function(arrStr, keyName, valueName) {
            var lstResult = [];
            if (arrStr && arrStr.length > 0) {
                for (var i = 0; i < arrStr.length; i++) {
                    var Item = arrStr[i];
                    var json = {};
                    json[keyName] = Item;
                    json[valueName] = Item;
                    lstResult.push(json);
                }
            }
            return lstResult;
        };
        //数组去重
        this.Distinct = function(arrStr) {
            var res = [];
            var json = {};
            for (var i = 0; i < arrStr.length; i++) {
                if (!json[arrStr[i]]) {
                    res.push(arrStr[i]);
                    json[arrStr[i]] = 1;
                }
            }
            return res;
        };
        //删除数组中某个元素
        this.ArrDelete = function(arr, keyValue) {
            var arrRes = [];
            if (arr && arr.length > 0) $(arr).each(function(index, value) {
                if (value != keyValue) {
                    arrRes.push(value);
                }
            });
            return arrRes;
        };
        //数组中添加一个元素
        this.ArrAdd = function(arr, keyValue) {
            var arrRes = [];
            arrRes.push(keyValue);
            if (arr && arr.length > 0) {
                if (arr.indexOf(keyValue) >= 0) {
                    arrRes = arr;
                } else {
                    arr.push(keyValue);
                    arrRes = arr;
                }
            }
            return arrRes;
        };
        //分页
        this.ArrJsonPaged = function(arrJson, pageSize, pageNumber, queryJson) {
            var resLst = [];
            var tempPagerNumebr = pageNumber ? pageNumber : 0;
            var tempPageSize = pageSize ? pageSize : 0;
            var skip = tempPagerNumebr ? tempPagerNumebr * tempPageSize : 0;
            //this.IsEmptyJson(queryJson)
            if (arrJson.length > skip) {
                var count = arrJson.length - skip;
                var resultCount = count > tempPageSize ? tempPageSize : count;
                for (var i = 0; i < resultCount; i++) {
                    resLst.push(arrJson[skip + i]);
                }
            }
            return resLst;
        };
        //0:表示头部匹配，1：全文匹配， 2：尾部匹配  3:模糊匹配
        this.JsonArrFilterByJson = function(arrJson, valueFiledName, newJson, type) {
            var tempType = type ? type : 0;
            var thisObj = this;
            var arrResJson = [];
            if (arrJson && arrJson.length > 0) $(arrJson).each(function(index, value) {
                var flag = true;
                for (var tempKey in newJson) {
                    var sourceValue = JsonHelper.GetJsonValue(value, tempKey);
                    var compareValue = newJson[tempKey];
                    if (typeof sourceValue == "object") {
                        sourceValue = JsonHelper.GetJsonValue(sourceValue, valueFiledName);
                    }
                    if (compareValue instanceof Array && compareValue.length > 0) {
                        flag = flag && compareValue.indexOf(sourceValue) > -1;
                    } else {
                        switch (tempType) {
                            case 0:
                                flag = flag && sourceValue.indexOf(compareValue) == 0;
                                break;

                            case 1:
                                flag = flag && sourceValue == compareValue;
                                break;

                            case 2:
                                flag = flag && sourceValue.length - compareValue.length == sourceValue.lastIndexOf(compareValue);
                                break;

                            case 3:
                                flag = flag && sourceValue.indexOf(compareValue) >= 0;
                                break;

                            default:
                                break;
                        }
                    }
                    if (!flag) {
                        break;
                    }
                }
                if (flag) {
                    arrResJson.push(value);
                }
            });
            return arrResJson;
        };
        //获取js字符串的值
        this.GetStrValue = function(json, key) {
            return json[key] || "";
        };
        //获取json中的json值
        this.GetJsonValue = function(json, key) {
            return json[key] || {};
        };
        //判断是否为JSON对象
        this.IsJsonObj = function(data) {
            if (typeof data == "object" && Object.prototype.toString.call(data).toLowerCase() == "[object object]" && !data.length) {
                return true;
            }
            return false;
        };
    }();
    return {
        enxHelper: EnxHelper,
        enxConstField: EnxConstField,
        jsonHelper: JsonHelper
    };
});