'use client';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Radio,
  RadioGroup,
  Select,
  SelectItem
} from '@heroui/react';
import { Dispatch, SetStateAction } from 'react';
import { regions } from '../../config/config';

// Type from parent component
type GenerationOptions = {
  mode: 'questions' | 'answers' | 'all';
  region: string;
  totalCount: number;
  workerCount: number;
  maxQPerWorker: number;
  maxAttempts: number;
  batchSize: number;
  delay: number;
};

type SettingsPanelProps = {
  options: GenerationOptions;
  setOptions: Dispatch<SetStateAction<GenerationOptions>>;
  isRunning: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleStop: () => Promise<void>;
  onAddRegionClick: () => void;
};

/**
 * Settings panel component for configuring generation options
 */
export function SettingsPanel({
  options,
  setOptions,
  isRunning,
  handleSubmit,
  handleStop,
  onAddRegionClick
}: SettingsPanelProps) {
  return (
    <div className="w-full lg:w-[480px] animate-in slide-in-from-left-5 duration-700 ease-out">
      <Card className="h-full rounded-2xl overflow-hidden border border-slate-200/70 shadow-md bg-white/95 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/70">
        <CardHeader className="px-6 py-5 border-b border-slate-200/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
            <i className="ri-settings-4-line text-blue-600"></i>
            Generation Settings
          </h2>
        </CardHeader>
        <CardBody className="p-6">
          <div className="h-full max-h-[calc(100vh-180px)] lg:max-h-full overflow-y-auto scrollbar-none">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Generation Mode */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Generation Mode
                </label>
                <RadioGroup
                  value={options.mode}
                  onValueChange={(value) => setOptions({ ...options, mode: value as any })}
                  className="flex flex-col gap-3"
                >
                  <div className="grid grid-cols-1 gap-3">
                    <Radio value="questions" className="group w-full">
                      <div className="w-full min-w-[400px] flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 group-data-[selected=true]:bg-blue-50/50 group-data-[selected=true]:border-blue-200 transition-colors duration-300 hover:bg-slate-100/50 hover:border-slate-300 cursor-pointer">
                        <div className="mt-0.5">
                          <i className="ri-questionnaire-line text-lg text-slate-400 group-data-[selected=true]:text-blue-500"></i>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-700 group-data-[selected=true]:text-blue-600">Questions Only</div>
                          <div className="text-sm text-slate-500 group-data-[selected=true]:text-blue-500/80">Generate only questions without answers</div>
                        </div>
                      </div>
                    </Radio>
                    <Radio value="answers" className="group w-full">
                      <div className="w-full min-w-[400px] flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 group-data-[selected=true]:bg-blue-50/50 group-data-[selected=true]:border-blue-200 transition-colors duration-300 hover:bg-slate-100/50 hover:border-slate-300 cursor-pointer">
                        <div className="mt-0.5">
                          <i className="ri-chat-check-line text-lg text-slate-400 group-data-[selected=true]:text-blue-500"></i>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-700 group-data-[selected=true]:text-blue-600">Answers Only</div>
                          <div className="text-sm text-slate-500 group-data-[selected=true]:text-blue-500/80">Generate only answers for existing questions</div>
                        </div>
                      </div>
                    </Radio>
                    <Radio value="all" className="group w-full">
                      <div className="w-full min-w-[400px] flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 group-data-[selected=true]:bg-blue-50/50 group-data-[selected=true]:border-blue-200 transition-colors duration-300 hover:bg-slate-100/50 hover:border-slate-300 cursor-pointer">
                        <div className="mt-0.5">
                          <i className="ri-chat-poll-line text-lg text-slate-400 group-data-[selected=true]:text-blue-500"></i>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-700 group-data-[selected=true]:text-blue-600">Questions & Answers</div>
                          <div className="text-sm text-slate-500 group-data-[selected=true]:text-blue-500/80">Generate both questions and answers</div>
                        </div>
                      </div>
                    </Radio>
                  </div>
                </RadioGroup>
              </div>

              <Divider className="bg-slate-200/70" />

              {/* Region Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Region
                  </label>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={onAddRegionClick}
                    className="px-2.5 h-8 rounded-lg font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-300"
                  >
                    <i className="ri-add-line mr-1"></i>
                    Add Region
                  </Button>
                </div>
                <Select
                  value={options.region}
                  onChange={(e) => {
                    const selectedRegion = regions.find(r => r.name === e.target.value);
                    if (selectedRegion) {
                      setOptions({ 
                        ...options, 
                        region: `${selectedRegion.pinyin}` 
                      });
                    }
                  }}
                  className="w-full"
                  startContent={
                    <i className="ri-map-pin-line text-blue-500 flex-shrink-0 leading-tight"></i>
                  }
                  placeholder="Select a region"
                >
                  {regions.map((region) => (
                    <SelectItem 
                      key={region.name} 
                      textValue={region.name}
                      className="group"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <i className="ri-map-pin-2-line text-slate-400 group-data-[selected=true]:text-blue-500 leading-tight"></i>
                          <span className="font-medium text-slate-700 group-data-[selected=true]:text-blue-600 leading-normal">{region.name}</span>
                          <span className="text-sm text-slate-500 leading-normal">({region.pinyin})</span>
                        </div>
                        {region.description && (
                          <div className="text-sm text-slate-500 group-data-[selected=true]:text-blue-500/80 pl-6 leading-tight">
                            {region.description}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <Divider className="bg-slate-200/70" />

              {/* Generation Parameters */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Generation Parameters
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    label="Total Count"
                    value={options.totalCount.toString()}
                    onChange={(e) => setOptions({ ...options, totalCount: parseInt(e.target.value) })}
                    min={1}
                    className="w-full"
                    startContent={
                      <i className="ri-numbers-line text-blue-500 flex-shrink-0 leading-tight"></i>
                    }
                  />
                  <Input
                    type="number"
                    label="Worker Count"
                    value={options.workerCount.toString()}
                    onChange={(e) => setOptions({ ...options, workerCount: parseInt(e.target.value) })}
                    min={1}
                    className="w-full"
                    startContent={
                      <i className="ri-robot-line text-blue-500 flex-shrink-0 leading-tight"></i>
                    }
                  />
                  <Input
                    type="number"
                    label="Max Q/Worker"
                    value={options.maxQPerWorker.toString()}
                    onChange={(e) => setOptions({ ...options, maxQPerWorker: parseInt(e.target.value) })}
                    min={1}
                    className="w-full"
                    startContent={
                      <i className="ri-stack-line text-blue-500 flex-shrink-0 leading-tight"></i>
                    }
                  />
                  <Input
                    type="number"
                    label="Max Attempts"
                    value={options.maxAttempts.toString()}
                    onChange={(e) => setOptions({ ...options, maxAttempts: parseInt(e.target.value) })}
                    min={1}
                    className="w-full"
                    startContent={
                      <i className="ri-restart-line text-blue-500 flex-shrink-0 leading-tight"></i>
                    }
                  />
                  <Input
                    type="number"
                    label="Batch Size"
                    value={options.batchSize.toString()}
                    onChange={(e) => setOptions({ ...options, batchSize: parseInt(e.target.value) })}
                    min={1}
                    className="w-full"
                    startContent={
                      <i className="ri-folder-line text-blue-500 flex-shrink-0 leading-tight"></i>
                    }
                  />
                  <Input
                    type="number"
                    label="Delay (ms)"
                    value={options.delay.toString()}
                    onChange={(e) => setOptions({ ...options, delay: parseInt(e.target.value) })}
                    min={0}
                    className="w-full"
                    startContent={
                      <i className="ri-time-line text-blue-500 flex-shrink-0 leading-tight"></i>
                    }
                  />
                </div>
              </div>

              <Button
                type={isRunning ? "button" : "submit"}
                onPress={isRunning ? handleStop : undefined}
                color={isRunning ? "danger" : "primary"}
                className={`w-full font-medium mt-8 shadow-md transition-all duration-300 ease-out rounded-xl py-6 ${
                  isRunning 
                  ? 'animate-pulse bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg hover:shadow-red-200/50' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg hover:shadow-blue-200/50 hover:translate-y-[-2px] active:translate-y-[1px]'
                }`}
                size="lg"
                variant="solid"
              >
                <span className="flex items-center justify-center gap-2">
                  {isRunning ? (
                    <>
                      <i className="ri-stop-fill"></i>
                      Stop Generation
                    </>
                  ) : (
                    <>
                      <i className="ri-play-fill"></i>
                      Start Generation
                    </>
                  )}
                </span>
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>
    </div>
  );
} 