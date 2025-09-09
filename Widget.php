<?php declare(strict_types = 0);


namespace Modules\RMESvgGraph;

use Zabbix\Core\CWidget;

class Widget extends CWidget {

	public function getDefaultName(): string {
		return _('RME Graph');
	}

	public function getTranslationStrings(): array {
		return [
			'class.widget.js' => [
				'Actions' => _('Actions'),
				'Download image' => _('Download image')
			]
		];
	}
}
