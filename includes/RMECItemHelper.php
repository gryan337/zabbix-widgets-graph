<?php declare(strict_types = 0);


namespace Modules\RMESvgGraph\Includes;

class RMECItemHelper {

	public static function getAggregateFunctionName(int $function): string {
		static $names;

		if ($names === null) {
			$names = [
				AGGREGATE_NONE => _('not used'),
				AGGREGATE_MIN => _('min'),
				AGGREGATE_MAX => _('max'),
				AGGREGATE_AVG => _('avg'),
				AGGREGATE_COUNT => _('count'),
				AGGREGATE_SUM => _('sum'),
				AGGREGATE_FIRST => _('first'),
				AGGREGATE_LAST => _('last'),
				CWidgetFieldDataSet::AGGREGATE_SUMAVG => _('sumOfAvg'),
				CWidgetFieldDataSet::AGGREGATE_ITEMCOUNT => _('itemCount')
			];
		}

		return $names[$function];
	}

}
