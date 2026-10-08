// مخطط الأسنان: UR علوي أيمن، UL علوي أيسر، LR سفلي أيمن، LL سفلي أيسر
// كما بالصورة: الربع الأيمن للمريض يظهر على يسار الشاشة، لذلك المخطط دائماً LTR
const LEFT_SIDE = [8, 7, 6, 5, 4, 3, 2, 1];
const RIGHT_SIDE = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ToothChart({ selected = [], onToggle, small = false }) {
  const readOnly = typeof onToggle !== 'function';

  const boxSize = small ? 'w-3 h-3' : 'w-7 h-7';
  const labelSize = small ? 'text-[9px]' : 'text-xs';
  const gap = small ? 'gap-0.5' : 'gap-1.5';
  const padding = small ? 'p-1' : 'p-3';

  const renderRow = (quadrant, numbers, labelOnTop) => (
    <div className={`flex ${gap}`}>
      {numbers.map((n) => {
        const id = `${quadrant}${n}`;
        const active = selected.includes(id);
        return (
          <div
            key={id}
            className={`flex items-center ${labelOnTop ? 'flex-col' : 'flex-col-reverse'}`}
          >
            <span className={`${labelSize} text-gray-500 leading-none mb-0.5`}>{n}</span>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => onToggle(id)}
              aria-pressed={active}
              aria-label={`سن ${n} (${quadrant})`}
              className={`${boxSize} border border-teal-800 ${
                active ? 'bg-teal-800' : 'bg-white'
              } ${readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-teal-200'} ${
                active && !readOnly ? 'hover:bg-teal-700' : ''
              } focus:outline-none focus:ring-2 focus:ring-teal-400`}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div dir="ltr" className="inline-block">
      <div className="flex">
        <div className={`${padding} border-r border-b border-teal-800`}>
          {renderRow('UR', LEFT_SIDE, true)}
        </div>
        <div className={`${padding} border-b border-teal-800`}>
          {renderRow('UL', RIGHT_SIDE, true)}
        </div>
      </div>
      <div className="flex">
        <div className={`${padding} border-r border-teal-800`}>
          {renderRow('LR', LEFT_SIDE, false)}
        </div>
        <div className={padding}>{renderRow('LL', RIGHT_SIDE, false)}</div>
      </div>
    </div>
  );
}
