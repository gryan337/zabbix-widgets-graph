# zabbix-widgets-graph
An enhanced Graph Widget for the Zabbix Dashboard

## Functionality and Features
- Adds an interactive legend that enables toggling on/off of lines/points/bars in the graph. This feature allows for single-click as well as holding the ctrl-key to select/unselect multiple items in the legend. (NOTE: metrics in the legend with the same name will prevent this from working correctly. for now, ensure all metrics have distinct names in the legend).
- All values will now display in the legend, and additional metrics will now overflow and scroll bar is added in the legend.
- Adds the ability to sort legend statistics by the max/avg/min colums (NOTE: can not sort by metric name (yet))
- If the name of the metric in the legend is too long an ellipsis is shown. Modifications have been made to show the full name when hovering over these metrics with a tooltip
- Adds point highlighting in the graph tooltip / hintbox.
- Adds the ability to sort the graph tooltip / hintbox by name or value (asc or desc).
- Changes the tooltip / hintbox to left-align the metric name and right-align the value allowing for easier distinction of the name and value.
- Adds 2 new aggregation functions: itemCount and sumOfAvg. sumOfAvg fixes a long standing issue when using the sum aggregation with metrics that are rates (i.e. bps, packets-per-second, something-per-second, etc...). Always use sumOfAvg for rate-based metrics.
- Adds a multiplier option in the Data set configuration. This is useful for some different use cases, like converting bytes to bps or bps back to bytes, or if you have a metric that is a percentage, and it ranges from 0 - 1, but you'd rather see it represented as 0 - 100.
- Adds the ability to use built-in and usermacros in the Data set label field. By default, the graph widget presents each metric as "HOSTNAME: ITEMNAME". For example, you can transform your metric to just be the metric name by typing {ITEM.NAME} in the Data set label box. Additionally, the full range of macro functions are supported. For example, with a item name of "CPU Usage - MyProcess", you could change the legend value by doing something like this: {{ITEM.NAME}.regrepl("CPU Usage - ", "")} and it will display as "MyProcess"
- Adds the ability to aggregate by item name. This works hand-in-hand with the added ability to use macros in the Data set label. This makes for an incredibly powerful experience and permits new ways to aggregate data in the graph.
- Adds the ability to prune all metrics where all values are 0. This is available as a checkbox in the Displaying options tab.
- Fixes an issue when using aggregate by dataset whereby the selected color does not end up being the color in display. This issue has to do with the color hue decrementing code for each individual metric and depending on the number of metrics aggregated you end up with some unexpected shade of the color chosen. When you aggregate by dataset now, the color chosen is what will be displayed.

## Disruptively Innovative Modifications
- This widget has been modified to accept multiple itemids broadcasted from certain widgets in the gryan337 git repository. As of right now the zabbix-widgets-itemnavigator module can broadcast multiple itemds. Soon, the Table widget will be able to (with significant advanced interactive functionality). More documentation coming soon!


# 🚀 Project Roadmap

A high-level view of our project milestones and upcoming goals.

---

## 📍 September 2025

- [ ] Add the ability to change the graph aggregation with a drop-down selection or from the actions menu of the widget  
- [ ] Basic documentation written along with screen shots of the enhancements  
- [ ] Final QA & bug fixes (please submit bugs!)  

---

## 🛠️ Upcoming (Q4 2025)

| Milestone | Status | Target |
|-----------|--------|--------|
| Crowd sourced feature requests | Upcoming | October 2025 |
| Research possibility of having the legend on the right side of the graph | 🔜 Planned | Q4 2025 |
| Research possibility of adding a header value for legend metric name which could permit sorting it | 🔜 Planned | Q4 2025 |
| Continuous improvement and listening to what users need | 🔜 Planned | Q4 2025 |

---
