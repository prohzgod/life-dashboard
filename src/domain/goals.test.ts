import { catchUp, formatAmount, goalPace, goalProgress, horizonDates, valueAt, type GoalLike, type ProgressContext } from './goals';

const goal = (over: Partial<GoalLike> = {}): GoalLike => ({
  id: 'g',
  parentGoalId: null,
  title: 'Run a half-marathon',
  progressMethod: 'metric',
  startValue: 0,
  targetValue: 21.1,
  currentValue: 0,
  unit: 'km',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'active',
  commitment: 'committed',
  progressLog: [],
  ...over,
});

const ctx = (over: Partial<ProgressContext> = {}): ProgressContext => ({
  goals: [],
  tasks: [],
  milestones: [],
  keyResults: [],
  habitConsistency: new Map(),
  ...over,
});

describe('goalProgress', () => {
  it('measures a number toward its target, and reads the log for past moments', () => {
    const g = goal({ currentValue: 13, progressLog: [{ at: '2026-05-01T00:00:00Z', value: 8 }, { at: '2026-09-01T00:00:00Z', value: 13 }] });
    expect(goalProgress(g, ctx()).percent).toBeCloseTo(61.6, 1);
    expect(goalProgress(g, ctx(), '2026-06-01T00:00:00Z').percent).toBeCloseTo(37.9, 1);
    expect(valueAt(g, '2026-01-02T00:00:00Z')).toBe(0);
  });

  it('counts tasks, or weighs them by estimate', () => {
    const tasks = [
      { goalId: 'g', status: 'done', estimateMin: 90, completedAt: '2026-03-01T00:00:00Z', parentTaskId: null },
      { goalId: 'g', status: 'open', estimateMin: 30, completedAt: null, parentTaskId: null },
      { goalId: 'g', status: 'done', estimateMin: 10, completedAt: '2026-03-01T00:00:00Z', parentTaskId: 'sub' },
      { goalId: 'other', status: 'done', estimateMin: 10, completedAt: '2026-03-01T00:00:00Z', parentTaskId: null },
    ];
    expect(goalProgress(goal({ progressMethod: 'taskCount' }), ctx({ tasks }))).toEqual({ percent: 50, done: 1, total: 2 });
    expect(goalProgress(goal({ progressMethod: 'weightedTasks' }), ctx({ tasks })).percent).toBe(75);
    expect(goalProgress(goal({ progressMethod: 'taskCount' }), ctx({ tasks }), '2026-02-01T00:00:00Z').percent).toBe(0);
  });

  it('counts milestones', () => {
    const milestones = [
      { goalId: 'g', doneAt: '2026-04-12T00:00:00Z' },
      { goalId: 'g', doneAt: '2026-08-23T00:00:00Z' },
      { goalId: 'g', doneAt: null },
    ];
    expect(goalProgress(goal({ progressMethod: 'milestones' }), ctx({ milestones }))).toMatchObject({ done: 2, total: 3 });
    expect(goalProgress(goal({ progressMethod: 'milestones' }), ctx({ milestones })).percent).toBeCloseTo(66.7, 1);
  });

  it('scores OKRs as the weighted key-result average', () => {
    const keyResults = [
      { goalId: 'g', start: 0, target: 10, current: 5, weight: 1 },
      { goalId: 'g', start: 0, target: 100, current: 100, weight: 1 },
      { goalId: 'g', start: 0, target: 4, current: 0, weight: 2 },
    ];
    const p = goalProgress(goal({ progressMethod: 'keyResultAverage' }), ctx({ keyResults }));
    expect(p.score).toBeCloseTo(0.375);
    expect(p.total).toBe(3);
  });

  it('averages habit consistency and rolls up children', () => {
    const habits = goalProgress(goal({ progressMethod: 'habitConsistency' }), ctx({ habitConsistency: new Map([['g', [0.9, 0.7]]]) }));
    expect(habits.percent).toBeCloseTo(80);

    const parent = goal({ id: 'p', progressMethod: 'childRollup' });
    const a = goal({ id: 'a', parentGoalId: 'p', progressMethod: 'manual', currentValue: 40, targetValue: 100 });
    const b = goal({ id: 'b', parentGoalId: 'p', progressMethod: 'manual', currentValue: 80, targetValue: 100 });
    const dropped = goal({ id: 'c', parentGoalId: 'p', progressMethod: 'manual', currentValue: 0, status: 'dropped' });
    expect(goalProgress(parent, ctx({ goals: [parent, a, b, dropped] })).percent).toBe(60);
  });

  it('has nothing to measure without data', () => {
    expect(goalProgress(goal({ progressMethod: 'milestones' }), ctx()).percent).toBeNull();
    expect(goalProgress(goal({ progressMethod: 'childRollup' }), ctx()).percent).toBeNull();
  });
});

describe('goalPace', () => {
  const today = '2026-10-01'; // 74.8% through the year

  it('is on pace within 3 points of the expected line', () => {
    expect(goalPace(goal(), 72.5, today)).toMatchObject({ state: 'on-pace', sentence: 'On pace' });
  });

  it('says how far behind in weeks, or in money for money goals', () => {
    expect(goalPace(goal(), 62, today)).toMatchObject({ state: 'behind', sentence: 'Behind by about 7 weeks' });
    const fund = goal({ title: '6-month emergency fund', startValue: 0, targetValue: 12000, unit: '$' });
    expect(goalPace(fund, 61.7, today).sentence).toBe('$1,571 behind pace');
  });

  it('holds stretch goals to 70% of the line', () => {
    expect(goalPace(goal({ commitment: 'aspirational' }), 52, today).state).toBe('on-pace');
    expect(goalPace(goal({ commitment: 'aspirational' }), 40, today).state).toBe('behind');
  });

  it('describes goals that have not started, ended, or have no data', () => {
    expect(goalPace(goal({ startDate: '2026-10-02' }), 0, today).sentence).toBe('Starts tomorrow');
    expect(goalPace(goal({ startDate: '2026-10-03' }), 0, today).sentence).toBe('Starts Saturday');
    expect(goalPace(goal({ startDate: '2026-12-01' }), 0, today).sentence).toBe('Starts 1 Dec');
    expect(goalPace(goal({ endDate: '2026-09-30' }), 80, today).sentence).toBe('Ended 30 Sep');
    expect(goalPace(goal(), null, today).state).toBe('no-data');
    expect(goalPace(goal({ status: 'done' }), 100, today).sentence).toBe('Done');
  });
});

describe('catchUp', () => {
  it('spreads the remaining amount over the weeks left', () => {
    const g = goal({ currentValue: 13 });
    const progress = goalProgress(g, ctx());
    const suggestion = catchUp(g, progress, goalPace(g, progress.percent, '2026-10-01'), '2026-10-01');
    expect(suggestion?.text).toBe('Catch up: about 0.6 km a week for the next 14 weeks gets you there by 31 Dec.');
  });

  it('suggests nothing when on pace', () => {
    const g = goal({ currentValue: 16 });
    const progress = goalProgress(g, ctx());
    expect(catchUp(g, progress, goalPace(g, progress.percent, '2026-10-01'), '2026-10-01')).toBeNull();
  });
});

describe('formatAmount', () => {
  it('formats money and units', () => {
    expect(formatAmount(1600, '$')).toBe('$1,600');
    expect(formatAmount(3.44, 'km')).toBe('3.4 km');
    expect(formatAmount(12, null)).toBe('12');
  });
});

describe('horizonDates', () => {
  it('spans the year, quarter, month or week around today', () => {
    expect(horizonDates('year', '2026-10-28')).toEqual({ startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(horizonDates('quarter', '2026-10-28')).toEqual({ startDate: '2026-10-01', endDate: '2026-12-31' });
    expect(horizonDates('quarter', '2026-02-10')).toEqual({ startDate: '2026-01-01', endDate: '2026-03-31' });
    expect(horizonDates('month', '2026-02-10')).toEqual({ startDate: '2026-02-01', endDate: '2026-02-28' });
    expect(horizonDates('week', '2026-10-28')).toEqual({ startDate: '2026-10-26', endDate: '2026-11-01' });
  });
});
