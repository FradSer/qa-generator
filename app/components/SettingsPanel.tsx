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
  ScrollShadow,
  Select,
  SelectItem
} from '@heroui/react';
import { Dispatch, SetStateAction } from 'react';
import { Region, regions } from '../../config/config';

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
    <div className="w-full lg:w-[480px] lg:min-w-[480px] flex-shrink-0 animate-in fade-in duration-500">
      <Card className="h-full rounded-2xl border border-slate-200/60 shadow-lg bg-white/90 backdrop-blur-sm">
        <CardHeader className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
            </svg>
            Generation Settings
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          <ScrollShadow className="h-[calc(100vh-200px)] px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-7 py-5">
              {/* Operation Mode */}
              <div className="space-y-3 bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl shadow-sm border border-slate-100">
                <label id="mode-label" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                    <path d="M5.625 3.75a2.625 2.625 0 100 5.25h12.75a2.625 2.625 0 000-5.25H5.625zM3.75 11.25a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75zM3 15.75a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zM3.75 18.75a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z" />
                  </svg>
                  Operation Mode
                </label>
                <RadioGroup
                  value={options.mode}
                  onValueChange={(value) => setOptions(prev => ({ ...prev, mode: value as GenerationOptions['mode'] }))}
                  orientation="horizontal"
                  classNames={{
                    wrapper: "gap-6"
                  }}
                  aria-labelledby="mode-label"
                >
                  <Radio 
                    value="questions" 
                    className="hover:scale-105 transition-all duration-300"
                    classNames={{
                      base: "border-blue-200 data-[selected=true]:border-blue-500",
                      label: "text-slate-700 font-medium",
                      control: "data-[selected=true]:bg-blue-500 data-[selected=true]:text-white"
                    }}
                  >
                    Questions
                  </Radio>
                  <Radio 
                    value="answers" 
                    className="hover:scale-105 transition-all duration-300"
                    classNames={{
                      base: "border-blue-200 data-[selected=true]:border-blue-500",
                      label: "text-slate-700 font-medium",
                      control: "data-[selected=true]:bg-blue-500 data-[selected=true]:text-white"
                    }}
                  >
                    Answers
                  </Radio>
                  <Radio 
                    value="all" 
                    className="hover:scale-105 transition-all duration-300"
                    classNames={{
                      base: "border-blue-200 data-[selected=true]:border-blue-500",
                      label: "text-slate-700 font-medium",
                      control: "data-[selected=true]:bg-blue-500 data-[selected=true]:text-white"
                    }}
                  >
                    All
                  </Radio>
                </RadioGroup>
              </div>

              {/* Region Selection */}
              <div className="space-y-3 bg-gradient-to-br from-slate-50 to-white p-5 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM6.262 6.072a8.25 8.25 0 1010.562-.766 4.5 4.5 0 01-1.318 1.357L14.25 7.5l.165.33a.809.809 0 01-1.086 1.085l-.604-.302a1.125 1.125 0 00-1.298.21l-.132.131c-.439.44-.439 1.152 0 1.591l.296.296c.256.257.622.374.98.314l1.17-.195c.323-.054.654.036.905.245l1.33 1.108c.32.267.46.694.358 1.1a8.7 8.7 0 01-2.288 4.04l-.723.724a1.125 1.125 0 01-1.298.21l-.153-.076a1.125 1.125 0 01-.622-1.006v-1.089c0-.298-.119-.585-.33-.796l-1.347-1.347a1.125 1.125 0 01-.21-1.298L9.75 12l-1.64-1.64a6 6 0 01-1.676-3.257l-.172-1.03z" clipRule="evenodd" />
                    </svg>
                    Region Selection
                  </label>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={onAddRegionClick}
                    className="font-medium bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-300 px-3 rounded-lg shadow-sm hover:shadow"
                  >
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                      </svg>
                      Add New
                    </span>
                  </Button>
                </div>
                <Select
                  label="Select Region"
                  placeholder="Choose a region"
                  selectedKeys={[options.region]}
                  onChange={(e) => setOptions(prev => ({ ...prev, region: e.target.value }))}
                  className="w-full transition-all"
                  variant="bordered"
                  popoverProps={{
                    placement: "bottom",
                    offset: 5,
                    classNames: {
                      base: "z-[999]"
                    }
                  }}
                  classNames={{
                    trigger: "bg-white shadow-sm border-slate-200 hover:border-blue-300 hover:ring-2 hover:ring-blue-100 transition-all duration-300",
                    listbox: "bg-white/95 backdrop-blur-md shadow-lg border-0 overflow-auto rounded-lg",
                    base: "w-full"
                  }}
                >
                  {regions.map((region: Region) => (
                    <SelectItem 
                      key={region.pinyin} 
                      textValue={`${region.name} (${region.pinyin})`}
                      className="data-[hover=true]:bg-blue-50 data-[hover=true]:text-blue-600 data-[selected=true]:bg-blue-100 data-[selected=true]:text-blue-700 py-2.5 px-3 border-0 transition-colors duration-200"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{region.name} ({region.pinyin})</span>
                        <span className="text-xs text-slate-500 mt-0.5 line-clamp-1">{region.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
              </div>

              <Divider className="my-2 opacity-70" />

              {/* Numeric Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  type="number"
                  label="Total Questions"
                  value={options.totalCount.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, totalCount: parseInt(e.target.value) }))}
                  min={1}
                  variant="bordered"
                  labelPlacement="outside"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
                  }}
                />

                <Input
                  type="number"
                  label="Worker Count"
                  value={options.workerCount.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, workerCount: parseInt(e.target.value) }))}
                  min={1}
                  max={20}
                  variant="bordered"
                  labelPlacement="outside"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                      <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM1.5 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM17.25 19.128l-.001.144a2.25 2.25 0 01-.233.96 10.088 10.088 0 005.06-1.01.75.75 0 00.42-.643 4.875 4.875 0 00-6.957-4.611 8.586 8.586 0 011.71 5.157v.003z" />
                    </svg>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
                  }}
                />

                <Input
                  type="number"
                  label="Max Questions/Worker"
                  value={options.maxQPerWorker.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, maxQPerWorker: parseInt(e.target.value) }))}
                  min={1}
                  max={100}
                  variant="bordered"
                  labelPlacement="outside"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm4.5 7.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zm3.75-1.5a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0V12zm2.25-3a.75.75 0 01.75.75v6.75a.75.75 0 01-1.5 0V9.75A.75.75 0 0113.5 9zm3.75-1.5a.75.75 0 00-1.5 0v9a.75.75 0 001.5 0v-9z" clipRule="evenodd" />
                    </svg>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
                  }}
                />

                <Input
                  type="number"
                  label="Max Attempts"
                  value={options.maxAttempts.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, maxAttempts: parseInt(e.target.value) }))}
                  min={1}
                  max={10}
                  variant="bordered"
                  labelPlacement="outside"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                      <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
                      <path d="M5.26 17.242a.75.75 0 10-.897-1.203 5.243 5.243 0 00-2.05 5.022.75.75 0 00.625.627 5.243 5.243 0 005.022-2.051.75.75 0 10-1.202-.897 3.744 3.744 0 01-3.008 1.51c0-1.23.592-2.323 1.51-3.008z" />
                    </svg>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
                  }}
                />

                <Input
                  type="number"
                  label="Batch Size"
                  value={options.batchSize.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                  min={1}
                  max={100}
                  variant="bordered"
                  labelPlacement="outside"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                      <path d="M21 6.375c0 2.692-4.03 4.875-9 4.875S3 9.067 3 6.375 7.03 1.5 12 1.5s9 2.183 9 4.875z" />
                      <path d="M12 12.75c2.685 0 5.19-.586 7.078-1.609a8.283 8.283 0 001.897-1.384c.016.121.025.244.025.368C21 12.817 16.97 15 12 15s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.285 8.285 0 001.897 1.384C6.809 12.164 9.315 12.75 12 12.75z" />
                      <path d="M12 16.5c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 15.914 9.315 16.5 12 16.5z" />
                      <path d="M12 20.25c2.685 0 5.19-.586 7.078-1.609a8.282 8.282 0 001.897-1.384c.016.121.025.244.025.368 0 2.692-4.03 4.875-9 4.875s-9-2.183-9-4.875c0-.124.009-.247.025-.368a8.284 8.284 0 001.897 1.384C6.809 19.664 9.315 20.25 12 20.25z" />
                    </svg>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
                  }}
                />

                <Input
                  type="number"
                  label="Delay (ms)"
                  value={options.delay.toString()}
                  onChange={(e) => setOptions(prev => ({ ...prev, delay: parseInt(e.target.value) }))}
                  min={0}
                  step={100}
                  variant="bordered"
                  labelPlacement="outside"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
                    </svg>
                  }
                  className="w-full transition-all hover:translate-y-[-2px] duration-300 group"
                  classNames={{
                    inputWrapper: "bg-white shadow-sm border-slate-200 group-hover:border-blue-300 group-hover:shadow group-focus-within:border-blue-500 group-focus-within:ring-2 group-focus-within:ring-blue-100",
                    label: "text-slate-700 font-medium text-sm flex items-center gap-2",
                    input: "text-slate-700"
                  }}
                />
              </div>

              {/* Submit Button */}
              <Button
                type={isRunning ? "button" : "submit"}
                onPress={isRunning ? handleStop : undefined}
                color={isRunning ? "danger" : "primary"}
                className={`w-full font-medium mt-8 shadow-md transition-all duration-500 rounded-xl py-6 ${
                  isRunning 
                  ? 'animate-pulse bg-gradient-to-r from-red-500 to-red-600 hover:shadow-red-200' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:translate-y-[-2px] hover:shadow-lg hover:shadow-blue-200'
                }`}
                size="lg"
                variant={isRunning ? "solid" : "solid"}
              >
                <span className="flex items-center justify-center gap-2">
                  {isRunning ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
                      </svg>
                      Stop Generation
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                      </svg>
                      Start Generation
                    </>
                  )}
                </span>
              </Button>
            </form>
          </ScrollShadow>
        </CardBody>
      </Card>
    </div>
  );
} 