var SidebarHandler = function () {

    this.Notifications = undefined;
    this.Editors       = undefined;
    this.Files         = undefined;

    this.dirEntry      = null;
    this.isInitialised = false;

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Private Sidebar
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    this._initialiseTreeView = function (dirTreeJson, title) {

        var $sidebar = this.getSidebar();

        if (dirTreeJson.length === 0) {
            return false;
        }

        if (this.isInitialised) {
            $sidebar.treeview('remove');
        } else {
            $sidebar.html('');
        }

        $sidebar.treeview({data: dirTreeJson, silent: false});
        this.isInitialised = true;
        this._setSidebarTopMenu(title);
        this.compressNodes();
        this.showSidebar();

        new BootstrapMenu('.node-sidebar', {
            fetchElementData: function ($el) {
                return $el
            },
            actions: [{
                name: 'New',
                classNames: 'dropdown-item',
                iconClass: 'fa fa-plus',
                onClick: function () {
                    // run when the action is clicked
                }
            }, {
                name: 'Rename',
                classNames: 'dropdown-item',
                iconClass: 'fa fa-edit',
                onClick: function (e) {

                    console.log(e.attr('data-idx'), e.data('text'));

                    var $el = $('<div></div>', {
                        'class': 'modal-rename-file',
                        'data-toggle': 'modal',
                        'data-target': '.modal-md-container',
                        'data-title': 'Rename file',
                        'data-idx': 'Rename file',
                        'data-nodeid': 'Rename file',
                        'data-old-filename': 'Rename file',
                        'data-new-filename': 'Rename file'
                    });
                    $el.appendTo('body').trigger('click');
                    $el.remove();
                }
            }, {
                name: 'Delete',
                classNames: 'dropdown-item',
                iconClass: 'fa fa-close',
                onClick: function () {
                    // run when the action is clicked
                }
            }]
        });
    };

    this._setSidebarTopMenu = function (title) {
        this.getAside().find('.sidebar-menu-title').html(title);
    };

    this._setNodeName = function (nodeId, nodeName) {

        if (typeof nodeId === typeof undefined) {
            return false;
        }

        var $el      = this.getSidebar().find('.node-sidebar[data-nodeid="' + nodeId + '"]').first();
        var $spanEls = $el.find('span');

        // Update the node
        var node = this.getSidebar().treeview('getNode', nodeId);
        if (typeof node !== typeof undefined) {
            node.path = node.path.replace(node.text, nodeName);
            node.text = nodeName;
        }

        $el.html(nodeName);
        $el.prepend($spanEls);
    };

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Public Sidebar
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    this.init = function (notifications, editors, files) {
        this.Notifications = notifications;
        this.Editors       = editors;
        this.Files         = files;
    };

    this.getSidebar = function () {
        return $(document).find('.sidebar').first();
    };

    this.getAside = function () {
        return $(document).find('aside').first();
    };

    this.showSidebar = function () {
        this.getAside().collapse('show');
    };

    this.hideSidebar = function () {
        this.getAside().collapse('hide');
    };

    this.expandNodes = function () {
        var $sidebar = this.getSidebar();
        if (this.isInitialised) {
            $sidebar.treeview('expandAll');
        }
    };

    this.compressNodes = function () {
        var $sidebar = this.getSidebar();
        if (this.isInitialised) {
            $sidebar.treeview('collapseAll');
        }
    };

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// Public Event Handlers
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /*######################################################
    ## EVENT (Sidebar)
    ######################################################*/
    this.onOpenProject = function () {

        var that  = this;
        var modes = [];

        this.Files.directoryOpen().then(function (dirEntry) {

            that.dirEntry = dirEntry;

            var sortFn = function (a, b) {
                if (a.typeFile !== b.typeFile) {
                    return a.typeFile > b.typeFile;
                }
                return a.text > b.text;
            };

            var buildTreeViewJson = function (entry, callback) {

                var results = [];

                // noinspection JSUnresolvedFunction
                entry.createReader().readEntries(function (entries) {

                    var pending = entries.length;

                    if (!pending) {

                        // noinspection JSUnresolvedVariable
                        var obj = {
                            text: entry.name,
                            path: entry.fullPath,
                            typeFile: 0,
                            icon: 'fa fa-fw fa-folder',
                            selectable: false
                        };

                        if (results.length > 0) {
                            results   = results.sort(sortFn);
                            obj.nodes = results;
                        }

                        callback(obj);
                    }

                    entries.forEach(function (item) {
                        if (item.isDirectory) {

                            buildTreeViewJson(item, function (res) {

                                // noinspection JSUnresolvedVariable
                                var obj = {
                                    text: item.name,
                                    path: item.fullPath,
                                    typeFile: 0,
                                    icon: 'fa fa-fw fa-folder',
                                    selectable: false
                                };

                                if (res.length > 0) {
                                    res       = res.sort(sortFn);
                                    obj.nodes = res;
                                }

                                results.push(obj);
                                results = results.sort(sortFn);

                                if (!--pending) {
                                    callback(results);
                                }
                            });
                        }
                        else {

                            var ext = that.Editors.getExtFromFileEntry(item);

                            // noinspection JSUnresolvedVariable
                            results.push({
                                text: item.name,
                                path: item.fullPath,
                                typeFile: 1,
                                icon: (modes.hasOwnProperty(ext)) ? modes[ext].icon : 'fa fa-fw fa-file fa-sidebar',
                                selectable: false
                            });

                            results = results.sort(sortFn);

                            if (!--pending) {
                                callback(results);
                            }
                        }
                    });
                });
            };

            that.Editors.getAllEditorModes().then(function (data) {
                modes = JSON.parse(data);
                buildTreeViewJson(dirEntry, function (treeViewJson) {
                    that._initialiseTreeView(treeViewJson, dirEntry.name);
                });
            });
        });
    };

    this.onNodeClick = function (nodeId) {

        var that = this;
        var node = this.getSidebar().treeview('getNode', nodeId);

        if (node.typeFile === 1) {

            this.Editors.getTabsNavContainer().find('li a').each(function (i, v) {

                var $v         = $(v);
                var nodeIdAttr = $v.attr('data-nodeid');

                if (typeof nodeIdAttr === typeof undefined && nodeIdAttr === nodeId) {
                    that.Editors.setTabNavFocus($v.attr('data-idx'));
                    return false;
                }
            });

            // noinspection JSUnresolvedFunction
            this.dirEntry.getFile(node.path, {}, function (fileEntry) {
                that.Files.fileOpen(fileEntry).then(function (e, fileEntry) {
                    that.Editors.onAddNewTab(
                        that.Editors.getExtFromFileEntry(fileEntry),
                        that.Editors.getNameFromFileEntry(fileEntry),
                        e.target.result,
                        fileEntry,
                        nodeId
                    );
                });
            });
        }
    };

    /*######################################################
    ## EVENT (File)
    ######################################################*/
    this.onRenameFile = function (nodeId, fileEntry) {
        this._setNodeName(nodeId, fileEntry.name);
    };

    this.onChangeNameFile = function (nodeId, fileName) {
        this._setNodeName(nodeId, fileName);
    };

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////
};