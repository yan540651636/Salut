define(['config', 'core/backbone'], function(C, Backbone) {
	var PDW = (function(UDF) {
		var BKStorage = {},
			BackbonePage = {},
			BackboneDataOnPage = {},
			books = -1,
			viewOrder = [],
			//界面之间的前后顺序，按照书写代码顺序排序
			PAGEORDER = 0,
			needShow = true,
			NavPage = [],
			BackboneViewStorage = {},
			BackboneCollection = new Backbone.Collection(),
			ActiveRoute,
			pageWinow = $('#pageWindow');
			function _addViewOrder (n) {
				viewOrder.push(n)
			}

			function _addNavPage(n) {
				if (NavPage.indexOf(n) > -1)
					return;
				NavPage.push(n)
			}

			function _getViewOrder(i) {
				if (i === UDF)
					return viewOrder;
				return viewOrder[i];
			}

			function _getPreView() {
				return viewOrder[viewOrder.length - 2]
			}

			//覆盖某个模型的数据 初始对象不能为undefined
			function _refreshModel(n, d) {
				BackboneDataOnPage[n] = BackboneDataOnPage[n] || {};
				return $.extend(BackboneDataOnPage[n], d)
			}

			//为某个某个模型添加，该模型初始值可以是undefined
			function _updateModel(n, d) {
				var cid = BKStorage[n].cid;
				BackboneCollection.get(cid).set(d)
			}
			//更具createpage中的参数创建backbone界面和模型
			function _loadPage(options) {
				options = options || {};
				var defaults = options;
				var n = defaults.name;
				var _callback = function() {
					_show(n, defaults.type);
					if (defaults.type !== 'normal') return;
					//每个界面跳转的时候需要告知程序该界面所需的导航
					if (defaults.nav.length > 0) {
						var navArr = defaults.nav;
						$('.navigate').addClass('fixednav');
							require(['use/Nav'], function(M) {
								for (var i = 0, l = navArr.length; i < l; i++) {
									var module = M[navArr[i]];
									module.show()
								}
							})
						return
					} else {
						$('body > .navigate').addClass('fixednav')
					}
				}
				//非初次载入
				if (!$.isEmptyObject(BackbonePage[n])) {
					if (defaults.applyChange === false) {
						_callback();
						return
					}
					if (defaults.url) {
						_ajax({
							url: defaults.url,
							success: function(r) {
								var _modeldata = _refreshModel(n, r.data);
								var cid = BKStorage[n].cid;
								BackboneCollection.get(cid).set(BackboneDataOnPage[n] || {});
								_callback()
							},
							error: function(xhr) {
								console.error('ajax repsonse wrong:' + xhr)
							}
						})
					} else {
						var cid = BKStorage[n].cid;
						var modelData = BackboneDataOnPage[n];
						if (defaults.applyChange === true) {
							$.extend(modelData, {
								timeStr: +new Date()
							})
						}
						BackboneCollection.get(cid).set(modelData || {});
						_callback()
					}
				//初次载入
				} else {
					BackbonePage[n] = {};
					BKStorage[n] = {};
					BackboneDataOnPage[n] = BackboneDataOnPage[n] || {};
					if (!defaults.url) {
						var _modeldata = _refreshModel(n);
						var _model = new(_getBackboneModel(defaults.model))(_modeldata);
						BKStorage[n].cid = _model.cid;
						BackboneCollection.add(_model);
						BackbonePage[n] = new(_getBackboneView(n, defaults.view))({
							model: _model
						});
						_callback()
					} else {
						_ajax({
							url: defaults.url,
							success: function(r) {
								var _modeldata = _refreshModel(n, r.data);
								var _model = new(_getBackboneModel(defaults.model))(_modeldata);
								BKStorage[n].cid = _model.cid;
								BackboneCollection.add(_model);
								BackbonePage[n] = new(_getBackboneView(n, defaults.view))({
									model: _model
								});
								_callback()
							},
							error: function(xhr) {
								console.error('ajax repsonse wrong:' + xhr)
							}
						})
					}
				}
				return BackbonePage[n]
			}
			//扩展backbone模型对象
			function _getBackboneModel(d) {
				var defaults = $.extend({}, d);
				var model = Backbone.Model.extend(defaults);
				return model
			}
			//如果有需要滑动的 或者类似幻灯片效果元素，启用swiper插件，该配置用法请查看官方文档。
			function _implement(list) {
				if (list.length > 0) {
					var type = list.attr('type');
					var cls = list.attr('swiper');
					require(['core/Swiper'],
						function(S) {
							var options;
							if (type == 'banner') {
								options = {
									pagination: '.swiper-pagination',
									loop: true,
									grabCursor: true,
									paginationClickable: true
								}
							} else {
								options = {
									freeMode: true,
									slidesPerView: 'auto',
									freeModeFluid: true,
									direction: 'vertical',
								}
							}
							var tempSwipeVar = new S(cls, options);
							setTimeout(function() {
									tempSwipeVar.update()
								},
								100)
						})
				}
			}
			//扩展backbone View对象 存入对象栈中
			function _getBackboneView(n, d) {
				var view;
				var defaults = $.extend({
						el: '#' + n,
						initialize: function() {
							this.render_bak();
							this.model.bind('change', this.render, this)
						},
						render: function(u) {
							//渲染之前的处理方法
							this.beforeRender && this.beforeRender.call(this);
							this.$el.html(this.template(this.model.toJSON()));
							//以swiper为标识的容器
							var list = this.$el.find('div.swiper');
							_implement(list);
							//渲染之后的处理方法
							this.afterRender && this.afterRender.call(this)
						},
						template: function(json) {
							if ($('#tpl' + n).length == 0)
								return;
							return Backbone.template($('#tpl' + n).html())(json)
						},
						render_bak: function() {
							var _self = this;
							if ($('#tpl' + n).length != 0) {
								this.render();
								return
							}
							//异步加载模板文件
							PDW.ajax({
								url: C.loadHtmlPath + _loadHtml(n) + '.html?version=' + (+new Date()),
								async: false,
								headers: {
									Accept: 'text/html'
								},
								dataType: 'html',
								success: function(x) {
									$('body').append(x);
									_self.render();
									//加载子元素
									Backbone.Events.trigger(n + '-loadChildElement');

									//console.log(Backbone.Events.)
									//如果有子元素回调方法则执行之
									Backbone.Events.trigger('jumpback');
								}
							})
						}
					}, d);
				view = Backbone.View.extend(defaults);
				return view
			}
			//删除某个扩展类，很少用到。内存占用到你绝得可以删除的时候调用此方法即可
			function _deleteClass(books) {
				[].slice($.inArray(n, BKStorage), 1)
			}
			function _setData(n, d) {
				BKData[n] = BKData[n] || {};
				if (d.url) {
					BKData[n].changed = !!(BKData[n].url != d.url);
					BKData[n].url = d.url;
					return BKData[n].datas
				}
				BKData[n].datas = d;
				BKData[n].changed = true;
				return BKData[n]
			}
			function _getData(n) {
				return BKData[n] || {}
			}
			//获取地址栏中的地址
			function getParams(name) {
				var spa = location.search.replace(/^\?/, '').split('&');
				var r;
				for (var i = 0, l = spa.length; i < l; i++) {
					var temp = spa[i].split('=');
					if (name === temp[0]) r = temp[1]
				}
				return r
			}
			//界面跳转的动画函数
			function animation(obj) {
				var defaults = $.extend({}, {
						el: '',
						direction: 'left->100%',
						callback: function() {},
						delay: C.pageTransformDelay
					},
					obj);
				var direction = defaults.direction.split('->')[0];
				var remote = defaults.direction.split('->')[1] || 100;
				var el = defaults.el;
				var translate = '';
				switch (direction) {
					case 'left':
						el[0].style.cssText = '-webkit-transform: translateX(100%);';
						translate = 'translateX(-' + remote + ')';
						break;
					case 'right':
						el[0].style.cssText = '-webkit-transform: translateX(-100%);';
						translate = 'translateX(' + remote + ')';
						break;
					case 'top':
						el[0].style.cssText = '-webkit-transform: translateY(100%);';
						translate = 'translateY(-' + remote + ')';
						break;
					case 'bottom':
						el[0].style.cssText = '-webkit-transform: translateY(-100%);';
						translate = 'translateY(' + remote + ')';
						break
				}
				el.addClass('page_show');
				setTimeout(function() {
						var css = '-webkit-transition:all ' + defaults.delay/1000 + 's;-webkit-transform: ' + translate + '; z-index:900;';
						el[0].style.cssText = css
					}, 17);
				var t = setTimeout(function() {
						el[0].style.cssText = '';
						defaults.callback.call(null);
						clearTimeout(t)
					}, defaults.delay + 50)
			}
			//自定义封装的ajax方法
			function _ajax(o) {
				if (typeof o.url === 'undefined') {
					return alert('请输入请求地址！')
				}
				var tempSuccess = o.success;
				o.success = function(r) {
					if (r.status == 0) {
						(o.wrong && o.wrong(r)) || alert(r.data);
						return
					} else if (r.status == 3) {
						Router.myNavigate('Login', 'Login', true)
					} else {
						tempSuccess && tempSuccess(r)
					}
				}
				var tempComplete = o.complete;
				o.complete = function(r) {
					tempComplete !== UDF && tempComplete.call(null, r);
					o.modal === undefined && PB.toast({
						message: 'loading...',
						status: 'end'
					});
				}
				$.ajax($.extend({
						url: '',
						type: 'GET',
						dataType: 'json',
						beforeSend: function() {
							o.modal === undefined && PB.toast({
								message: 'loading...',
								delay: C.ajaxDelay
							});
						},
						error: function(XMLHttpRequest, textStatus, errorThrown) {
							PB.tip({
								tipTxt: '网络连接失败，错误状态码:' + XMLHttpRequest.status
							})
						}
					},
					o || {}))
			}
			//各个界面的出现顺序和切换效果
			function _show(n, type) {
				//普通类型的界面跳转规则
				var page = $('#' + n);
				switch (type) {
					case 'normal':
						_addViewOrder(n);
						ActiveRoute = n;
						$('#pageWindow+.background').addClass('g-d-n');
						$('#pageWindow>.mask').hide().removeClass('move');
						//界面跳转的方向
						var direction = _orderChange(n, PDW.getPreView());
						animation({
							el: page,
							//界面跳转的方向
							direction: direction + '->0px',
							callback: function() {
								$('#pageWindow>.page_show').filter(function() {
									if (this.id != n) $(this).removeClass('page_show')
								})
							}
						})
						break;
						//遮罩界面的出现规则
					case 'mask':
						//隐藏弹出遮罩层
						if (page.hasClass('move')) {
							page.removeClass('move');
							setTimeout(function() {
								page.hide();
								$('#pageWindow+.background').removeClass('cover-' + n).addClass('g-d-n').css('z-index', 0);
							}, C.maskTransformDelay); //config
							//显示弹出遮罩层
						} else {
							page.show();
							setTimeout(function() {
								page.addClass('move');
								$('#pageWindow+.background').addClass('cover-' + n).removeClass('g-d-n').css('z-index', 1000);
							}, 50);
						}
						break;
						//导航固定界面的出现规则
					case 'navigate':
						$('#' + n).removeClass('fixednav');
						break;
						//其他界面出现规则
					default:
						//console.log('default............');
						break;
				}
			}
			//更具配置过滤hash值
			function _loadHtml(hash) {
				var config = C.PAGERULES;
				if (hash.indexOf('/')) {
					hash = hash.split('/')[0].toLocaleLowerCase()
				}
				for (var i in config) {
					if (config[i].indexOf(hash) > -1)
						hash = i
				}
				return hash.toLocaleLowerCase();
			}
			//创建cssloading图标
			function _createCssLoding(c) {
			}
			//界面加载的顺序，从左到右？从右到左？
			function _orderChange(n, p) {
				// var curModule = curModule.callback();
				var go = 'left';
				if (_getActiveRoute(n).options.order < _getActiveRoute(p).options.order) {
					go = 'right';
				}
				return go
			}
			//获得某个界面的模型 
			function _getModule(n) {
				return _observer.get(n)
			}
			//获取当前路由地址 
			function _getActiveRoute(p) {
				return _observer.get(p || ActiveRoute)
			}
			//获取当前执行脚本文件名
			function _currentScript(){
				if(document.currentScript) {
					return document.currentScript.src;
				}
		    var a = {}, stack;
		    try{
		      a.b();
		    }
		    catch(e){
		      stack = e.stack || e.sourceURL || e.stacktrace; 
		    }
		    var rExtractUri = /(?:http|https|file):\/\/.*?\/.+?.js/, 
		        absPath = rExtractUri.exec(stack);
		    return absPath[0] || '';
			}
			var _baseClass = {
				_init: function(obj) {
					this.options = $.extend({
						name: 'pageNull',
						applyChange: true,
						type: 'normal',
						model: {},
						view: {},
						nav: [],
						title: '',
						order: ++PAGEORDER
					}, obj);
					this._createdom.call(this);
					this._createPage();
				},
				//根据不同参数，创建不同的html标签以及添加不同的样式和类名
				_createHtml: {
					navigate: function(cls) {
						var elName = this.options.name;
						pageWinow.append('<' + elName + ' class="mui-bar mui-bar-nav fixednav ' + cls + '" id="' + this.options.name + '"></' + elName + '>'.trim());
					},
					mask: function(cls) {
						pageWinow.append('<div class="mask" id=' + this.options.name + ' data-direction=' + this.options.direction + '></div>'.trim())
					},
					refresh: function() {
						var options = this.options;
						var name = options.name;
						//父级元素的id
						var parent = options.parent;
						//声明并且返回父模块，
						var parentClass = this._bindParent();
						//重新定义el元素
						options.view.el = '#' + parent + ' .refresh-' + name;
						//由于主界面未渲染，因此容器不存在，再次注册方法 为渲染后界面所用
						Backbone.Events.once(parent + '-loadChildElement', function() {
							//将子元素的html内容添加到父容器中去
							$('#' + parent).find('div.refresh[name~="'+name+'"]').html('<div class="refresh-' + name + '"></div>'.trim())
							  //建立backbone界面和数据模型。---任何非normal的界面，没有router配置项 无法调用loadpage渲染，必须手动调用
								_loadPage(options);
								//上一步骤建立了数据模块后绑定子模块
								this._bindChildren(parentClass);
						}, this);
					},
					normal: function(cls) {
						//为普通界面添加上下内边距，适应导航条占用的位置
						for (var i = 0; i < this.options.nav.length; i++) {
							cls += ' hasnav-' + this.options.nav[i].toLocaleLowerCase()
						}
						pageWinow.append('<div class="page ' + cls + '" id="' + this.options.name + '"></div>'.trim())
					}
				},
				//动态创建界面最外层元素
				_createdom: function() {
					var cls = this.options.type;
					this._createHtml[this.options.type].call(this, cls);
				},
				//获得该界面的配置
				getOptions: function() {
					return this.options
				},
				//申明父元素
				_bindParent: function() {
					var options = this.options;
					//获取该界面模型的父级
					var parentClass = _getModule(options.parent);
					//为父类填子集
					parentClass.children = parentClass.children || {};
					//返回父类
					return parentClass;
				},
				//绑定子元素
				_bindChildren: function(parent) {
					parent.children[this.options.name] = this;
				},
				//将自定义事件复制给backbone界面对象
				_createPage: function() {
					this._MyEventToBackbone()
				},
				//刷新界面（非reload重载，只做数据刷新）
				refreshView: function() {
					this._normal()
				},
				//从配置中接收注册事件进行处理
				_MyEventToBackbone: function() {
					var myEvents = this.options.view.pageEvent;
					if (this.options.view === undefined) return;
					var backboneEvent = (this.options.view.events = {});
					var backboneView = this.options.view;
					//对注册事件的格式进行切割过滤等处理
					for (var e in myEvents) {
						if(!myEvents.hasOwnProperty(e)) continue;
						var eventArr = e.split('->');
						var eventName = eventArr[0].replace(/^\s+|\s+$/gi, '');
						var eventFun = eventArr[1].replace(/^\s+|\s+$/gi, '');
						backboneEvent[eventName] = eventFun;
						this.options.view[eventFun] = myEvents[e]
					}
					this.options.view.pageEvent = null
				},
				//刷新界面（非reload重载，只做数据刷新）
				reloadView: function(d) {
					//如果是动态数据载入则再次刷新url
					if(this.options.url) {
						_loadPage(this.options, d);
					//静态数据直接给模型赋值
					}else{
						_updateModel(this.options.name, d);
					}
					
				},
				//一次性刷新所有子界面
				reloadAllChildren: function(d) {
					var children = this.children;
					for(var i in children) {
							children[i].reloadView(d);
						}
				},
				//路由跳转时传入下个界面模型数据 d：数据对象 object
				addDataToModel: function(d) {
					_refreshModel(this.options.name, d);
				},
				//显示界面 普通界面之间的跳转不用此方法。
				show: function() {
					this._normal();
					return this;
				},
				//隐藏某个界面 普通界面之间的跳转不用此方法。
				hide: function() {
					if (this.options.type === 'mask') {
						_show(this.options.name, 'mask');
					}
				},
				//分析并且注册路由
				_normal: function(p) {
					var defaults = this.options;
					var s = (defaults.models || function() {} )() || {};
					if (defaults.url) {
						url = (typeof defaults.url === 'function') ? defaults.url() : defaults.url;
						var u = url.replace(/\[[^\]]*\]/g, function(result) {
							var returnValue;
							//再次挑出特殊符号
							result = result.replace(/\[|\]/g, '');
							//如果配置有默认值
							if(result.indexOf('|') > -1) {
								//分隔符取值
								var res = result.split('|');
								//如果没有传入参数或者参数为空 则取默认值 ([0|default])
								var index = +res[0];
								returnValue = p[index] || res[1];
							}else{
								//获得传入的参数
								returnValue = p[result] || '';
							}
							return returnValue;
						});
						u = u || url;
						s = { url: u }
					}
					_loadPage($.extend({}, this.options, s));
				},
				//创建界面模型
				loadPageModel: function(s) {
					_setData(this.n, s || {})
				},
				//创建界面
				loadPageView: function(s) {
					s = $.extend({}, {
						name: this.n
					}, s);
					_createProject(s)
				},
				//手动改变hash值时触发的函数
				_Route: function() {
						this.title && PB.setPageTitle(this.title);
						this._normal([].slice.call(arguments, 0));
				}
			}
			//创建一个界面的类
			function _Class(obj) {
				obj = obj || {};
				var F = function() {
					var func = Backbone.truss(this._Route, this);
					this._init.call(this, obj);
					obj.route && Router.route(obj.route, this.n, func)
				};
				$.extend(F.prototype, _baseClass, obj.fn || {});
				var page = new F();
				//添加实例到内存中
				return _observer.add(obj.name, page);
			};
		//观察和收集每个界面的实例
		var _observer = (function() {
			var obser = [];
			//向内存中添加界面模块 name:模块名 page:界面
			function add(name, page) {
				obser.push({ name: name, page: page });
				return page;
			}
			//从内存中获取模块 name:模块名称
			function aply(name) {
				var u = 0;
				for (var i = 0, l = obser.length; i < l; i++) {
					if (obser[i]['name'] == name) {
						return obser[i].page;
					}
				}
				return u;
			}
			//获得所有界面集合
			function get() {
				return obser
			}
			return {
				add: add,
				// aply: aply,
				get: aply,
				list: get
			}
		})();

		//策略算法验证
		var _verifly = function(option) {
			var reg = $.extend({
				//文本
				text: function(v, l) {
					if (v === '') {
						return false;
					}
				},
				//最大字符长度
				maxLength: function(v, l) {
					if (v.length > l) {
						return false;
					}
				},
				//最少字符长度
				minLength: function(v, l) {
					if (v.length < l) {
						return false;
					}
				},
				//手机号码
				phone: function(v) {
					if (!(/^1[3|8|5][0-9]{9}$/.test(v))) {
						return false;
					}
				},
				//身高
				tall: function(v) {
					if (v && !(/^1\d{2}$/.test(v))) {
						return false;
					}
				},
				//体重
				weight: function(v) {
					if (v && !(/^\d{2}$/.test(v))) {
						return false;
					}
				},
				//照片大小
				img: function(img) {
					if (img && img.size / 1024 > 1000 && !(/\.jpg|\.png/.test(img.name))) {
						return false;
					}
				}
			}, option);

			function veriflyReg(v, regs) {
				var fnType = regs.veriflyType.split(':');
				return reg[fnType[0]].apply(null, [v, fnType[1]])
			}

			function publicVerifly(v, regs) {
				var tof;
				if ($.isPlainObject(regs)) {
					var v = veriflyReg.apply(null, [v, regs]);
					if (v === false) {
						tof = regs.errorMessgag;
					}

				} else {
					for (var i = 0; i < regs.length; i++) {
						if (veriflyReg.apply(null, [v, regs[i]]) === false) {
							tof = regs[i].errorMessgag;
							break;
						}
					}
				}
				return tof;
			}

			function otherPublicVerifly(arr) {
				var message;
				for (var i = 0; i < arr.length; i++) {
					var v = arr[i].value;
					var regs = arr[i].rules;
					message = publicVerifly(v, regs);
					if (message !== undefined) {
						break;
					}
				}
				return message;
			}
			return otherPublicVerifly;
		}
		return {
			Data: {
				create: _setData,
				get: _getData
			},
			getAllBooks: function() {
				var arr = new Array;
				for (var i = 0; i < books + 1; i++)
					arr.push(i.toString());
				return arr
			},
			Observer: _observer,
			getViewOrder: _getViewOrder,
			getPreView: _getPreView,
			// getLastView: _getThisView,
			pushThisView: _addViewOrder,
			ajax: _ajax,
			getActiveRoute: _getActiveRoute,
			getModule: _getModule,
			createPage: _Class,
			getParams: getParams,
			verifly: _verifly,
			filterHash: _loadHtml
		}
	})();
	var Router = new(Backbone.Router.extend({
		//两个不同大模块之间的跳转 包含此路由的bigmodule 文件名 route 路由名称 callback跳转后的回调函数
		myNavigate: function(route, callback) {
			//过滤提取纯粹的route 不包含参数
			var newroute = route.replace(/\(.*\)/gi, '').replace(/#/, '').split('\/')[0];
			//获取模型数据
			var getModule = PDW.Observer.get(newroute);
			//如果模块已经载入好
			if (getModule) {
				callback && callback.call(getModule);
				this.navigate(route, true);
			} else {//异步载入文件
				var _self = this;
				var m = require([C.loadJsPath + PDW.filterHash(newroute)], function(exports) {
					_self.navigate('#' + route, true);
					if(callback) {
						//该路由模块无子模块
						if(!exports[newroute].children) {
							callback.call(exports[newroute]);
							return;
						}
						//如果该模块有子模块 注册回掉函数，等待子模块建立完成执行回掉
						var jumpback = function() {
							callback.call(this);
							// Backbone.Events.off('jumpback', jumpback);
						}
						Backbone.Events.once('jumpback', jumpback, exports[newroute]);
						return;
					}
					
				})
			}
		}
	}));
	var PB = (function(root, UDF) {
		var exports = {};
		exports.publicVar = {};
		exports.get = function(n) {
			return this.publicVar[n] || UDF
		}
		exports.set = function(n, v) {
			this.publicVar[n] = v
		}
		exports.setPageTitle = function(title) {
			document.title = title;
			var u = navigator.userAgent.toLowerCase();
			if (u.match(/iphone/i) == "iphone") {
				var $body = $('body');
				var $iframe = $('<iframe style="display:none;" src="/favicon.ico"></iframe>').on('load',
					function() {
						setTimeout(function() {
								$iframe.off('load').remove()
							},
							0)
					}).appendTo($body)
			}
		}
		exports.message = function(obj) {
			var defaults = $.extend({
					type: 'alert',
					title: '你确认要这样做吗？',
					height: $(window).height()
				},
				obj);
			var tobj = $('.J-message')

			,
			target = $('.J-message .J-' + defaults.type)

			,
			OBtn = tobj.find('.J-' + defaults.type + ' .J-ok')

			,
			CBtn = tobj.find('.J-' + defaults.type + ' .J-cancel');
			tobj.height(defaults.height);
			$('.J-message .J-box').addClass('g-d-n').removeClass('g-d-b');
			target.addClass('g-d-b').removeClass('g-d-n');
			target.find('.J-word').text(defaults.title);
			tobj.addClass('g-d-b').removeClass('g-d-n');
			OBtn.off();
			OBtn.on('tap',
				function() {
					if (typeof defaults.ok == 'function')
						defaults.ok();
					tobj.addClass('g-d-n').removeClass('g-d-b')
				});
			if (CBtn.length == 0)
				return;
			CBtn.off();
			CBtn.on('tap',
				function() {
					if (typeof defaults.cancel == 'function')
						defaults.cancel();
					tobj.addClass('g-d-n').removeClass('g-d-b')
				})
		}
		exports.tip = function(options) {
			if ($('.J-tip').attr('showed') == '1')
				return;
			$('.J-tip').attr('showed', '1');
			var paramObj = {
				tipTxt: "this is tip text!!",
				delay: 2000,
				callBack: function() {},
				callBackPram: ""
			};
			$.extend(paramObj, options || {});
			$(".J-tip").find(".J-tipWp").html(paramObj.tipTxt);
			setTimeout(function() {
					var t = 0 - $(".J-tip").height() / 2;
					$(".J-tip").find(".J-tipWp").css({
						top: t
					});
					$(".J-tip").addClass("_tipBx-show")
				},
				100);
			setTimeout(function() {
					$(".J-tip").removeClass("_tipBx-show");
					$('.J-tip').attr('showed', '0');
					if (paramObj.callBack && typeof(paramObj.callBack) == "function") {
						paramObj.callBack(paramObj.callBackPram)
					}
				},
				paramObj.delay)
		}
		//插件，toast提示
		exports.toast = function(opt) {
			//强行停止加载toast
			if (opt.status === 'end') {
				clearTimeout(exports.publicVar['toast-meter']);
				$('.J-loadingoutsidebox').addClass('g-d-n');
				exports.publicVar['toast-key'] = undefined;
			}
			var defaults = $.extend({
				message: 'loading',
				delay: 100,
				//
				type: 'loading',
				//loading, success, faile, unconnectable;
				callback: function() {

				}
			}, opt);
			if (exports.publicVar['toast-key'] !== undefined) {
				return;
			}
			exports.publicVar['toast-key'] = 1;
			var height = $(window).height();
			var width = $(window).width();
			var w = width / 2 - 40;
			var h = height / 2 - 60;
			var htmlstring = '<div class="J-loadingoutsidebox"><div class="am-toast-text-background"></div><div class="am-toast-text J-toast" style="top:' + h + 'px; left:' + w + 'px;">' +
				'<span class="am-icon" am-mode="' + defaults.type + '"></span><em>' + defaults.message + '</em>' +
				'</div></div>';
			if ($('.J-loadingoutsidebox').length) {
				var el = $('.J-loadingoutsidebox').removeClass('g-d-n');
				el.find('.am-icon').attr('am-mode', defaults.type).next().html(defaults.message);
			} else {
				var el = $('body').append(htmlstring).find('.J-loadingoutsidebox');
			}
			exports.publicVar['toast-meter'] = setTimeout(function() {
				clearTimeout(exports.publicVar['toast-meter']);
				exports.publicVar['toast-meter'] = null;
				exports.publicVar['toast-key'] = undefined;
				el.addClass('g-d-n');
				defaults.callback();
			}, defaults.delay);
		}
		exports.loadCss = function(g) {
				switch (g) {
					case 1:
					case 3:
					case 4:
						return "class='status_cfmt'";
					default:
						return "class='status_ct'"
				}
		}
		//输出当前时间
		exports.now = function() {
			function add0(e) {
				if (e < 10) {
					e = '0' + e;
				}
				return e;
			}
			var D = new Date();
			var year = D.getFullYear();
			var mouth = D.getMonth() + 1;
			mouth = add0(mouth);
			var day = add0(D.getDate());
			var hour = add0(D.getHours());
			var minute = add0(D.getMinutes());
			var second = add0(D.getSeconds());
			return year + '-' + mouth + '-' + day + ' ' + hour + ':' + minute + ':' + second;
		}
		return (root.PB = exports)
	})(window);
	var _PRO_ = {
		PDW: PDW,
		Router: Router,
		Event: Event
	}
	return _PRO_
});