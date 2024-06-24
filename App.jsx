import React from 'react';
import { createAssistant, createSmartappDebugger } from '@salutejs/client';
import './App.css';

const initializeAssistant = (getState) => {
    if (process.env.NODE_ENV === 'development') {
        return createSmartappDebugger({
            token: process.env.REACT_APP_TOKEN ?? '',
            initPhrase: `Запусти ${process.env.REACT_APP_SMARTAPP}`,
            getState,
            nativePanel: {
                defaultText: "чччччч",
                screenshotMode: false,
                tabIndex: -1,
            },
        });
    } else {
        return createAssistant({ getState });
    }
};

class App extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            notes: [{ id: Math.random().toString(36).substring(7), title: 'тест' }],
            currentQuestion: 1,
            totalQuestions: 21,
            answers: Array(21).fill(null),
            result: null,
            showResult: false,
        };

        this.assistant = initializeAssistant(() => this.getStateForAssistant());
        this.assistant.on('data', (event) => {
            if (event.type === 'character') {
                console.log(`assistant.on(data): character: "${event?.character?.id}"`);
            } else if (event.type === 'insets') {
                console.log(`assistant.on(data): insets`);
            } else {
                const { action } = event;
                this.dispatchAssistantAction(action);
            }
        });

        this.assistant.on('start', (event) => {
            let initialData = this.assistant.getInitialData();
            console.log(`assistant.on(start)`, event, initialData);
        });

        this.assistant.on('command', (event) => {
            console.log(`assistant.on(command)`, event);
        });

        this.assistant.on('error', (event) => {
            console.log(`assistant.on(error)`, event);
        });

        this.assistant.on('tts', (event) => {
            console.log(`assistant.on(tts)`, event);
        });

        this.nextQuestion = this.nextQuestion.bind(this);
        this.prevQuestion = this.prevQuestion.bind(this);
        this.handleOptionChange = this.handleOptionChange.bind(this);
        this.showResult = this.showResult.bind(this);

    }
    componentDidMount() {
        console.log('componentDidMount');
    }

    nextQuestion() {
        this.setState(prevState => ({
            currentQuestion: Math.min(prevState.currentQuestion + 1, prevState.totalQuestions)
        }));
    }

    prevQuestion() {
        this.setState(prevState => ({
            currentQuestion: Math.max(prevState.currentQuestion - 1, 1)
        }));
    }

    handleOptionChange(event) {
        const { value } = event.target;
        const index = parseInt(value, 10);

        this.setState((prevState) => {
            const answers = [...prevState.answers];
            if (answers[prevState.currentQuestion - 1] === index) {
                answers[prevState.currentQuestion - 1] = null;
            } else {
                answers[prevState.currentQuestion - 1] = index;
            }
            return { answers };
        });
    }

    getStateForAssistant() {
        const state = {
            item_selector: {
                items: this.state.notes.map(({ id, title }, index) => ({
                    number: index + 1,
                    id,
                    title,
                })),
                ignored_words: [
                    'добавить', 'установить', 'запиши', 'поставь', 'закинь', 'напомнить',
                    'удалить', 'удали',
                    'выполни', 'выполнил', 'сделал'
                ],
            },
        };
        return state;
    }

    dispatchAssistantAction(action) {
        console.log('dispatchAssistantAction', action);
        if (action) {
            switch (action.type) {
                case 'add_Start':
                    return this.add_Start(action);
                case 'done_note':
                    return this.done_note(action);
                case 'delete_note':
                    return this.delete_note(action);
                case 'check_var':
                    return this.checkVar(action);
                case 'answer_question':
                    return this.answerQuestion(action);
                case 'next_question':
                    return this.nextQuestion();
                case 'prev_question':
                    return this.prevQuestion();
                case 'select_option':
                    return this.selectOption(action);
                default:
                    throw new Error();
            }
        }
    }

    add_Start() {
        console.log('Executing test_my function');
        this._send_action_value('voice', 'Я не чувствую себя расстроенным, печальным. \n Я расстроен. \n Я все время расстроен и не могу от этого отключиться. \n Я настолько расстроен и несчастлив, что не могу это выдержать.');
    }

    checkVar(action) {
        const optionText = action.parameters.selectedOption;
        const optionNumber = optionText.match(/\d+/);

        if (optionNumber) {
            const optionIndex = parseInt(optionNumber[0], 10) - 1;
            const optionValue = `option${optionIndex + 1}`;

            this.setState(prevState => {
                const answers = [...prevState.answers];
                answers[prevState.currentQuestion - 1] = optionValue;
                return { answers };
            });
        }
    }
    answerQuestion(action) {
        const optionIndex = action.option - 1;
        this.setState(prevState => {
            const answers = [...prevState.answers];
            answers[prevState.currentQuestion - 1] = optionIndex;
            return { answers };
        }, this.nextQuestion);
    }

    selectOption(action) {
        const { option } = action.parameters;
        this.setState(prevState => {
            const answers = [...prevState.answers];
            answers[prevState.currentQuestion - 1] = option;
            return { answers };
        });
    }

    done_note(action) {
        console.log('done_note', action);
        this.setState({
            notes: this.state.notes.map((note) =>
                note.id === action.id ? { ...note, completed: !note.completed } : note
            ),
        });
    }

    _send_action_value(action_id, value) {
        console.log(`Sending action ${action_id} with value ${value}`);
        const data = {
            action: {
                action_id: action_id,
                parameters: {
                    value: value,
                },
            },
        };
        const unsubscribe = this.assistant.sendData(data, (data) => {
            const { type, payload } = data;
            console.log('sendData onData:', type, payload);
            unsubscribe();
        });
    }

    play_done_note(id) {
        const completed = this.state.notes.find((note) => note.id === id)?.completed;
        if (!completed) {
            const texts = ['Молодец!', 'Красавчик!', 'Супер!'];
            const idx = (Math.random() * texts.length) | 0;
            this._send_action_value('done', texts[idx]);
        }
    }

    delete_note(action) {
        console.log('delete_note', action);
        this.setState({
            notes: this.state.notes.filter(({ id }) => id !== action.id),
        });
    }

    evaluateAnswers(answers) {
        const totalScore = answers.reduce((total, answer) => total + parseInt(answer, 10), 0);

        if (totalScore <= 9) {
            return "отсутствие депрессивных симптомов";
        } else if (totalScore <= 15) {
            return "легкая депрессия (субдепрессия)";
        } else if (totalScore <= 19) {
            return "умеренная депрессия";
        } else if (totalScore <= 29) {
            return "выраженная депрессия (средней тяжести)";
        } else {
            return "тяжелая депрессия";
        }
    }

    showResult() {
        const { answers } = this.state;
        const result = this.evaluateAnswers(answers);
        this.setState({ result, showResult: true });
    }

    getRecommendationsClass(result) {
        switch (result) {
            case "отсутствие депрессивных симптомов":
                return "none";
            case "легкая депрессия (субдепрессия)":
                return "mild";
            case "умеренная депрессия":
                return "moderate";
            case "выраженная депрессия (средней тяжести)":
                return "severe";
            case "тяжелая депрессия":
                return "extreme";
            default:
                return "";
        }
    }

    render() {
        const questions = [
            [
                "Я не чувствую себя расстроенным, печальным.",
                "Я расстроен.",
                "Я все время расстроен и не могу от этого отключиться.",
                "Я настолько расстроен и несчастлив, что не могу это выдержать."
            ],
            [
                "Я не тревожусь о своем будущем.",
                "Я чувствую, что озадачен будущим.",
                "Я чувствую, что меня ничего не ждет в будущем.",
                "Мое будущее безнадежно, и ничто не может измениться к лучшему."
            ],
            [
                "Я не чувствую себя неудачником.",
                "Я чувствую, что терпел больше неудач, чем другие люди.",
                "Когда я оглядываюсь на свою жизнь, я вижу в ней много неудач.",
                "Я чувствую, что как личность я - полный неудачник."
            ],
            [
                "Я получаю столько же удовлетворения от жизни, как раньше.",
                "Я не получаю столько же удовлетворения от жизни, как раньше.",
                "Я больше не получаю удовлетворения ни от чего.",
                "Я полностью не удовлетворен жизнью, и мне все надоело."
            ],
            [
                "Я не чувствую себя в чем-нибудь виноватым.",
                "Достаточно часто я чувствую себя виноватым.",
                "Большую часть времени я чувствую себя виноватым.",
                "Я постоянно испытываю чувство вины."
            ],
            [
                "Я не чувствую, что могу быть наказанным за что-либо.",
                "Я чувствую, что могу быть наказан.",
                "Я ожидаю, что могу быть наказан.",
                "Я чувствую себя уже наказанным."
            ],
            [
                "Я не разочаровался в себе.",
                "Я разочаровался в себе.",
                "Я себе противен.",
                "Я себя ненавижу."
            ],
            [
                "Я знаю, что я не хуже других.",
                "Я критикую себя за ошибки и слабости.",
                "Я все время обвиняю себя за свои поступки.",
                "Я виню себя во всем плохом, что происходит."
            ],
            [
                "Я никогда не думал покончить с собой.",
                "Ко мне приходят мысли покончить с собой, но я не буду их осуществлять.",
                "Я хотел бы покончить с собой.",
                "Я бы убил себя, если бы представился случай."
            ],
            [
                "Я плачу не больше, чем обычно.",
                "Сейчас я плачу чаще, чем раньше.",
                "Теперь я все время плачу.",
                "Раньше я мог плакать, а сейчас не могу, даже если мне хочется."
            ],
            [
                "Сейчас я раздражителен не более чем обычно.",
                "Я более легко раздражаюсь, чем раньше.",
                "Теперь я постоянно чувствую, что раздражен.",
                "Я стал равнодушен к вещам, которые меня раньше раздражали."
            ],
            [
                "Я не утратил интереса к другим людям.",
                "Я меньше интересуюсь другими людьми, чем раньше.",
                "Я почти потерял интерес к другим людям.",
                "Я полностью утратил интерес к другим людям."
            ],
            [
                "Я откладываю принятие решения иногда, как и раньше.",
                "Я чаще, чем раньше, откладываю принятие решения.",
                " Мне труднее принимать решения, чем раньше. ",
                "Я больше не могу принимать решения."
            ],
            [
                "Я не чувствую, что выгляжу хуже, чем обычно.",
                "Меня тревожит, что я выгляжу старым и непривлекательным.",
                "Я знаю, что в моей внешности произошли существенные изменения, делающие меня непривлекательным. ",
                "Я знаю, что выгляжу безобразно."
            ],
            [
                "Я могу работать так же хорошо, как и раньше.",
                "Мне необходимо сделать дополнительное усилие, чтобы начать делать чтонибудь.",
                "Я с трудом заставляю себя делать что-либо.",
                "Я совсем не могу выполнять никакую работу."
            ],
            [
                " Я сплю так же хорошо, как и раньше.",
                "Сейчас я сплю хуже, чем раньше.",
                "Я просыпаюсь на 1-2 часа раньше, и мне трудно заснуть опять.",
                "Я просыпаюсь на несколько часов раньше обычного и больше не могу заснуть."
            ],
            [
                "Я устаю не больше, чем обычно.",
                "Теперь я устаю быстрее, чем раньше.",
                "Я устаю почти от всего, что я делаю.",
                "Я не могу ничего делать из-за усталости."
            ],
            [
                "Мой аппетит не хуже, чем обычно.",
                "Мой аппетит стал хуже, чем раньше.",
                "Мой аппетит теперь значительно хуже.",
                "У меня вообще нет аппетита."
            ],
            [
                "В последнее время я не похудел или потеря веса была незначительной.",
                "За последнее время я потерял более 2 кг.",
                "Я потерял более 5 кг.",
                "Я потерял более 7 кr."
            ],
            [
                "Я беспокоюсь о своем здоровье не больше, чем обычно.",
                "Меня тревожат проблемы моего физического здоровья, такие, как боли, расстройство желудка, запоры и т.д.",
                "Я очень обеспокоен своим физическим состоянием, и мне трудно думать о чем-либо другом.",
                "Я настолько обеспокоен своим физическим состоянием, что больше ни о чем не могу думать."
            ],
            [
                "В последнее время я не замечал изменения своего интереса к сексу.",
                "Меня меньше занимают проблемы секса, чем раньше.",
                "Сейчас я значительно меньше интересуюсь сексуальными проблемами, чем раньше. ",
                "Я полностью утратил сексуальный интерес. "

            ]
        ];

        const divisions = Array.from({ length: this.state.totalQuestions }, (_, index) => ({
            number: index + 1,
            active: index < this.state.currentQuestion,
        }));

        const currentAnswer = this.state.answers[this.state.currentQuestion - 1];
        const currentOptions = questions[this.state.currentQuestion - 1];
        const isLastQuestion = this.state.currentQuestion === this.state.totalQuestions;
        const hasEmptyAnswers = this.state.answers.includes(null);

        if (this.state.result) {
            const resultClass = this.getRecommendationsClass(this.state.result);

            return (
                <div className="result-container">
                    <h1>Результаты теста на депрессию</h1>
                    <h2 className={`result ${resultClass}`}>Ваш результат: {this.state.result}</h2>
                    <div className={`recommendations ${resultClass}`}>
                        {this.state.result === "отсутствие депрессивных симптомов" && (
                            <p>Рекомендации: Продолжайте поддерживать здоровый образ жизни и обращайте внимание на свое эмоциональное состояние.</p>
                        )}
                        {this.state.result === "легкая депрессия (субдепрессия)" && (
                            <p>Рекомендации: Обратите внимание на источники стресса в вашей жизни и попробуйте снизить их влияние. Возможно, стоит обратиться за консультацией к специалисту.</p>
                        )}
                        {this.state.result === "умеренная депрессия" && (
                            <p>Рекомендации: Рекомендуется проконсультироваться с психологом или психотерапевтом для получения помощи и поддержки.</p>
                        )}
                        {this.state.result === "выраженная депрессия (средней тяжести)" && (
                            <p>Рекомендации: Обязательно обратитесь к специалисту в области психического здоровья. Возможно, потребуется комплексное лечение, включая медикаментозную терапию и психотерапию.</p>
                        )}
                        {this.state.result === "тяжелая депрессия" && (
                            <p>Рекомендации: Срочно обратитесь за медицинской помощью. Тяжелая депрессия требует немедленного вмешательства специалистов для предотвращения серьезных последствий.</p>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="container">
                <header className="header">
                    <h1>Тест на депрессию Бека</h1>
                </header>
                <div className="question-info">
                    {divisions.map(({ number }) => (
                        <div key={number} className="division-container">
                            <div
                                className={`question-number ${this.state.currentQuestion === number ? 'active' : ''} ${this.state.answers[number - 1] !== null ? 'answered' : ''}`}
                                onClick={() => this.setState({ currentQuestion: number })}
                            >
                                {number}
                            </div>
                        </div>
                    ))}
                </div>


                <div className="button-container">
                    {currentOptions.map((option, index) => (
                        <div key={index} className="option-container">
                            <input
                                type="checkbox"
                                id={`option${index + 1}`}
                                name="options"
                                value={index}
                                className="checkbox"
                                checked={currentAnswer === index}
                                onChange={this.handleOptionChange}
                            />
                            <label
                                htmlFor={`option${index + 1}`}
                                className={`label-button ${currentAnswer === index ? 'selected' : ''}`}
                            >
                                {option}
                            </label>
                        </div>
                    ))}

                    <div className="navigation-button-container">
                        {this.state.currentQuestion !== 1 && (
                            <button className="prev-button" onClick={this.prevQuestion}>Предыдущий вопрос</button>
                        )}

                        {isLastQuestion && (
                            <button
                                className="show-result-button"
                                onClick={this.showResult}
                                disabled={hasEmptyAnswers}
                            >
                                Показать результат
                            </button>
                        )}

                        {!isLastQuestion && (
                            <button className="next-button" onClick={this.nextQuestion}>Следующий вопрос</button>
                        )}
                    </div>
                </div>

                {this.state.result && (
                    <div className="result">
                        <h2>Ваш результат: {this.state.result}</h2>
                    </div>
                )}
            </div>
        );
    }
}
export default App;