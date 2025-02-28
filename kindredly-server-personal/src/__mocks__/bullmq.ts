const mockQueue = {
    add: jest.fn(),
    process: jest.fn(),
    close: jest.fn(),
    getJobs: jest.fn(),
    on: jest.fn(),
  };
  
  const mockQueueEvents = {
    on: jest.fn(),
    close: jest.fn(),
  };
  
  module.exports = {
    Queue: jest.fn(() => mockQueue),
    QueueEvents: jest.fn(() => mockQueueEvents),
  };