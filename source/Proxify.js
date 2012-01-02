enyo.kind({
	name: "MyApps.AddList",
	kind: enyo.VFlexBox,
	components: [
		{kind: "RowGroup", caption: "Add a proxy", components: [
			{kind: "Control", layoutKind: "VFlexLayout", components: [
				{kind: "Control", layoutKind: "HFlexLayout", components: [
					{changeOnInput: true, onchange: "inputOnChange", flex: 1, caption: "Name", hint: "Proxy name (not the IP!)", kind: "Input", name: "proxyName", style: "width:70%"},
					{disabled: true, name: "add", kind: "Button", flex: 1, caption: "Add", onclick: "addProxy"},
				]},
				{kind: "Control", layoutKind: "HFlexLayout", components: [
					{flex: 1, kind: "Control", layoutKind: "HFlexLayout", pack: "center", align: "mid", components: [
						{content: "IP:", layoutKind: "VFlexLayout", pack: "center"},
						{name: "proxyAddress", hint: "0.0.0.0", kind: "Input", style: "width: 50%", flex: 1},
						{content: ":", layoutKind: "VFlexLayout", pack: "center"},
						{name: "proxyPort", value: "8080", kind: "Input", flex: 1},
					]},
				]},
			]},
		]},
		{kind: "Dialog", components: [
			{name: "dialogContent", layoutKind: "HFlexLayout", pack: "center", style: "Padding-left: 10px"},
			{kind: "Button", flex: 1, caption: "OK", onclick: "closeDialog"},
		]},
	],
	
	addProxy: function(inSender, inEvent){
		var name = this.$.proxyName.getValue();
		for (var i = 0; i < MyApps.AddList.data.length; i++) {
			var record = MyApps.AddList.data[i]
			if (record.proxyName == name) {
				this.$.dialog.open();
				this.$.dialogContent.setContent('A proxy with the name "'+name+'" already exists!');
				return;
			};
		};
		
		MyApps.Proxify.pane.back();
		var proxy = this.$.proxyAddress.getValue();
		var port = this.$.proxyPort.getValue();
		try {
			MyApps.List.db.transaction(
				function (tx) {
					tx.executeSql('INSERT INTO table1 (proxyName, proxyAddress, proxyPort) VALUES ("' + name + '","' + proxy + '","' + port + '");');
				}.bind(this)
			);
		}
		catch (e)
		{
			//this.$.results.setContent(e);      
		}
	},
	inputOnChange :function(inSender) {
		if (inSender.getValue() != "") {
			this.$.add.setDisabled(false)
		}
		else {
			this.$.add.setDisabled(true)
		}
	},
	
	closeDialog: function() {
		this.$.dialog.close();
		MyApps.Proxify.pane.back();
	},
}),

enyo.kind({
	name: "MyApps.List",
	kind: enyo.VFlexBox,
	components: [
		{kind: "Divider", name: "listDivider", caption: "Proxy list"},
		{kind: "Scroller", flex: 1, components: [
			{kind: "RowItem", onclick: "selectOff", Xonmousedown: "selectOff", components: [
				{layoutKind: "HFlexLayout", align: "center", components: [
					{layoutKind: "VFlexLayout", flex: 1, components: [
						{content: "Off"},
					]},
					{name: "checkOff", kind: "Image", layoutKind: "HFlexLayout", align: "right", src: "images/selection-checkmark.png"},
				]},
			]},
			{name: "proxyList", className: "list", kind: "VirtualRepeater", onSetupRow: "listSetupRow", components: [
				{name: "item", flex: 1, kind: "SwipeableItem", layoutKind: "VFlexLayout", onConfirm: "deleteItem", onclick: "selectItem", Xonmousedown: "selectItem", components: [
					{layoutKind: "HFlexLayout", align: "center", components: [
						{layoutKind: "VFlexLayout", flex: 1, components: [
							{name: "listProxyName"},
							{name: "address"},
						]},
						{name: "check", kind: "Image", layoutKind: "HFlexLayout", align: "right", src: "images/selection-checkmark.png"},
					]},
				]}
			]}
		]},
		
		{name: "statusText", content: "Select one"},
		
		{kind: "PalmService",
		name: "setProxy",
		service: "palm://com.palm.connectionmanager/",
		method: "configureNwProxies",
		onSuccess: "proxyApplied",
		onFailure: "proxyApplicationFailed"},
	],
	
	set_proxy: function(action, address, port) {
		if (MyApps.AddList.data.majorVersion < 3) {
			this.$.setProxy.call({
				"action":action,
				"proxyInfo":{"proxyScope":"default","proxyServer":address,"proxyPort":port}
			});
		}
		else {
			this.$.setProxy.call({
				"action":action,
				"proxyInfo":{"proxyConfigType":"manualProxy","proxyScope":"default","proxyServer":address,"proxyPort":port}
			});
			this.$.statusText.setContent(address);
		}
	},
	
	showingChanged: function() {
		try {
			MyApps.List.db.transaction(
				function (tx) {
					tx.executeSql('select * from table1', [], enyo.bind(this,this.queryResponse), enyo.bind(this,this.errorHandler)); 
					tx.executeSql('select * from table2', [], enyo.bind(this,this.responseCheckIcon), []); 
				}.bind(this)
			);
		}
		catch (e)
		{
			//this.$.results.setContent(e);      
		}
	},
	
	create: function() {
		MyApps.AddList.data = [];
		this.inherited(arguments);
	},
	
	ready : function() {
		var info = enyo.fetchDeviceInfo();
		if (info) {
			MyApps.AddList.data.majorVersion = info.platformVersionMajor
		}
		
		try {
			MyApps.List.db = openDatabase('ProxifyDB', '', 'Proxify Data Store', 65536);
			MyApps.List.db.transaction(
				function (tx) {
					// Create the table if not already there
					tx.executeSql('CREATE TABLE table1 (proxyName, proxyAddress TEXT NOT NULL DEFAULT "nothing", proxyPort TEXT NOT NULL DEFAULT "nothing")', [], [], [])
					tx.executeSql('CREATE TABLE table2 (selected INTEGER, previous INTEGER)', [], [], [])
				 
					//Insert value
					//tx.executeSql('INSERT INTO table1 (proxyName, proxyAddress, proxyPort) VALUES ("name1","proxy1","port1")', [], [], [])
				 
					//SELECT query to display data
					tx.executeSql('select * from table1', [], enyo.bind(this,this.queryResponse), enyo.bind(this,this.errorHandler));
					//restore data for checkicon
					tx.executeSql('select * from table2', [], enyo.bind(this,this.responseCheckIcon), []); 
				
				}.bind(this)
			);
		}
		catch (e)
		{
			//this.$.results.setContent(e);      
		}
	},

	responseCheckIcon: function(transaction, results) {
		var length = results.rows.length
		if (length > 0) {
			MyApps.AddList.data.selected = results.rows.item(0).selected
			MyApps.AddList.data.previous = results.rows.item(0).previous
		}
		this.$.proxyList.render();
	},
	
	queryResponse: function(transaction, results) {
		var list = [];
		var length = results.rows.length// + 1
		//alert(results.rows.length);
		for (var i = 0; i < length; i++) {
			list[i] = results.rows.item(i);
		}
		MyApps.AddList.data = list; //set list to data
		//this.$.proxyList.render();
	},
	
	listSetupRow: function(inSender, inIndex) {
		var record = MyApps.AddList.data[inIndex]; //set data arry values to record
		if (record) {
			if (MyApps.AddList.data.selected != inIndex) {
				this.$.check.hide();
			}
			else {
				this.$.checkOff.hide();
			}
			
			this.$.listProxyName.setContent(record.proxyName);
			this.$.address.setContent(record.proxyAddress + ":" + record.proxyPort);
			return true;
		}
	},
	
	selectOff: function() {
		this.$.checkOff.show();
		
		MyApps.AddList.data.previous = MyApps.AddList.data.selected
		
		this.$.proxyList.prepareRow(MyApps.AddList.data.previous);
		this.$.check.hide();
		
		var address;
		var port;
		var record = MyApps.AddList.data[MyApps.AddList.data.previous]
		if (record) {
			address = record.proxyAddress
			port = parseInt(record.proxyPort)
		}
		this.set_proxy("rmv", address, port);
		
		try {
			MyApps.List.db.transaction(
				function (tx) {
					tx.executeSql('DELETE FROM table2;', [], [], []);
					tx.executeSql('INSERT INTO table2 (previous) VALUES ("'+MyApps.AddList.data.previous+'")', [], [], [])
				}.bind(this)
			);
		}
		catch (e)
		{
			//this.$.results.setContent(e);      
		}
	},
	
	selectItem: function(inSender, inEvent) {
		this.$.checkOff.hide();
		
		MyApps.AddList.data.previous = MyApps.AddList.data.selected
		MyApps.AddList.data.selected = inEvent.rowIndex
		
		this.$.proxyList.controlsToRow(MyApps.AddList.data.previous);
		this.$.check.hide();
		
		this.$.proxyList.controlsToRow(inEvent.rowIndex);
		this.$.check.show();
		
		if (MyApps.AddList.data.previous) {	
			var address;
			var port;
			var record = MyApps.AddList.data[MyApps.AddList.data.previous]
			if (record) {
				address = record.proxyAddress
				port = parseInt(record.proxyPort)
			}
			this.set_proxy("rmv", address, port);
		}
		var record = MyApps.AddList.data[MyApps.AddList.data.selected]
		if (record.proxyName != "Off") {
			var address = MyApps.AddList.data[MyApps.AddList.data.selected].proxyAddress
			var port = parseInt(MyApps.AddList.data[MyApps.AddList.data.selected].proxyPort)
			this.set_proxy("add", address, port);
		}
		
		try {
			MyApps.List.db.transaction(
				function (tx) {
					tx.executeSql('DELETE FROM table2;', [], [], []);
					tx.executeSql('INSERT INTO table2 (selected, previous) VALUES ("'+inEvent.rowIndex+'","'+MyApps.AddList.data.previous+'")', [], [], [])
				}.bind(this)
			);
		}
		catch (e)
		{
			//this.$.results.setContent(e);      
		}
		
	},

	proxyApplied: function(inSender, inResponse) {
		
	},
	proxyApplicationFailed: function(inSender, inResonse) {
		
	},
	
	deleteItem: function(inSender, inIndex) {
		var name
		if (MyApps.AddList.data.selected == inIndex) {
			var address;
			var port;
			var record = MyApps.AddList.data[inIndex];
			this.set_proxy("rmv", address, port);
		}
	
		if (record) {
			name = record.proxyName
			address = record.proxyAddress
			port = parseInt(record.proxyPort)
		}
		
		try {
			MyApps.List.db.transaction(
				function (tx) {
					tx.executeSql('DELETE FROM table1 WHERE proxyName="'+name+'";', [], [], []);
					tx.executeSql('select * from table1', [], enyo.bind(this,this.queryResponse), enyo.bind(this,this.errorHandler)); 
				}.bind(this)
			);
		}
		catch (e)
		{
			//this.$.results.setContent(e);      
		}
	},
}),

enyo.kind({
	name: "MyApps.Proxify",
	kind: enyo.VFlexBox,
	components: [
		{kind: "ApplicationEvents", onLoad: "appLoaded"},
		{kind: "PageHeader", name: "header", components: [
			{content: "Proxify", flex: 1},
			{name: "edit", kind: "Button", onclick: "edit"},
			{name: "backButton", kind: "Button", onclick: "edit", onclick: "goBack"},
		]},
		
 		{name: "pane", kind: "Pane", flex: 1, onSelectView: "viewSelected", components: [
			{name: "list", kind: "MyApps.List"},
			{name: "add", kind: "MyApps.AddList"},
		]},
		
		{name: "statusText", content: "Select one"},
	],
	
	ready: function() {
		this.$.pane.selectViewByName("list");
		
		var info = enyo.fetchDeviceInfo();
		if (info) {
			var majorVersion = info.platformVersionMajor
			
			//alert(majorVersion);
			this.$.statusText.setContent(majorVersion);
		}
	},
	
	viewSelected: function(inSender, inView) {
		if (inView == this.$.list) {
			this.$.edit.show();
			this.$.backButton.hide();
		}
		else if (inView == this.$.add) {
			this.$.edit.hide();
			this.$.backButton.show();
		}
	},
	
	goBack: function(inSender, inEvent) {
		this.$.pane.back(inEvent);
	},
	
	edit: function() {
		MyApps.Proxify.pane = this.$.pane;
		this.$.pane.selectViewByName("add");
	},
});