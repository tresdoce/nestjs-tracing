export class TracingInitializationError extends Error {
  readonly name = this.constructor.name;

  constructor() {
    super(
      'The tracer has not been initialized. You must call TracingService#onModuleInit() before accessing the tracer',
    );
  }
}
