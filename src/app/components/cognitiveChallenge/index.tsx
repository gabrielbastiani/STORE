'use client';

import { useTheme } from '@/app/contexts/ThemeContext';
import { useState, useEffect, useCallback, useRef } from 'react';

interface Challenge {
    question: string;
    answer: string;
}

interface CognitiveChallengeProps {
    onValidate: (isValid: boolean) => void;
}

const MAX_ATTEMPTS = 3;

const generateChallenge = (): Challenge => {
    const operators = ['+', '-', '*'];
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let answer: number;
    switch (operator) {
        case '+': answer = num1 + num2; break;
        case '-': answer = num1 - num2; break;
        case '*': answer = num1 * num2; break;
        default: answer = num1 + num2;
    }

    return { question: `${num1} ${operator} ${num2}`, answer: answer.toString() };
};

export const CognitiveChallenge = ({ onValidate }: CognitiveChallengeProps) => {

    const { colors } = useTheme();

    const [mounted, setMounted] = useState(false);
    const [userAnswer, setUserAnswer] = useState('');
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [attempts, setAttempts] = useState(0);
    const [isValid, setIsValid] = useState(false);
    const [error, setError] = useState('');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setMounted(true);
        setChallenge(generateChallenge());

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const validateAnswer = useCallback(() => {
        if (!challenge) return;

        const isCorrect = userAnswer === challenge.answer;
        if (isCorrect) {
            setIsValid(true);
            setError('');
            onValidate(true);
        } else {
            const newAttempts = attempts + 1;
            const remainingAttempts = MAX_ATTEMPTS - newAttempts;

            setAttempts(newAttempts);
            setError(`Resposta incorreta (Tentativas restantes: ${remainingAttempts > 0 ? remainingAttempts : 0})`);
            onValidate(false);

            if (newAttempts >= MAX_ATTEMPTS) {
                timeoutRef.current = setTimeout(() => {
                    setChallenge(generateChallenge());
                    setUserAnswer('');
                    setAttempts(0);
                    setError('');
                    setIsValid(false);
                }, 2000);
            }
        }
    }, [userAnswer, challenge, attempts, onValidate]);

    if (!mounted || !challenge) return null;

    return (
        <div className="mb-4 p-4 rounded-lg">
            <div className="mb-2">
                <label
                    style={{ color: colors?.textos_popup_login || "#000000" }}
                    className="block text-sm font-medium mb-2">
                    Desafio de segurança: Quanto é {challenge.question}?
                </label>
                <input
                    type="number"
                    value={userAnswer}
                    onChange={(e) => {
                        if (!isValid) setUserAnswer(e.target.value);
                    }}
                    className={`text-black w-full px-3 py-2 border rounded-md ${error ? 'border-red-500' : isValid ? 'border-green-500' : 'border-gray-300'
                        }`}
                    disabled={isValid}
                />
            </div>

            {error && !isValid && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
            )}

            {isValid && (
                <p className="text-green-500 text-sm mt-1">✓ Verificado com sucesso!</p>
            )}

            <button
                onClick={validateAnswer}
                disabled={isValid}
                style={{ color: colors?.textos_botoes || "#ffffff", background: colors?.fundo_botao_validar || "#f58439" }}
                className="mt-2 px-4 py-2 rounded-md disabled:bg-gray-400"
            >
                Validar Resposta
            </button>
        </div>
    );
};